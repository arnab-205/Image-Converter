/// PDF Processor Module
/// Handles PDF loading, OCG extraction, rendering, and page manipulation.

use anyhow::{anyhow, Result};
use base64::Engine;
use image::DynamicImage;
use lopdf::{dictionary, Document as LopdfDocument, ObjectId};
use pdfium_render::prelude::*;
use std::collections::HashSet;
use std::env;
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
// use lopdf::dictionary;

// ── Shared PDFium path singleton ──
// Resolving the DLL path is done once.
static PDFIUM_PATH: OnceLock<Option<PathBuf>> = OnceLock::new();

fn resolve_pdfium_path() -> Option<PathBuf> {
    let exe_dir = env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()));

    let candidates: Vec<PathBuf> = [
        exe_dir.as_ref().map(|d| d.join("resources").join("pdfium").join("pdfium.dll")),
        exe_dir.as_ref().map(|d| d.join("pdfium.dll")),
        Some(PathBuf::from("resources").join("pdfium").join("pdfium.dll")),
    ]
    .into_iter()
    .flatten()
    .collect();

    candidates.into_iter().find(|p| p.exists())
}

fn get_pdfium() -> Result<Pdfium> {
    let resolved = PDFIUM_PATH.get_or_init(resolve_pdfium_path);
    let bindings = match resolved {
        Some(path) => Pdfium::bind_to_library(path)
            .map_err(|e| anyhow!("Failed to load PDFium from {}: {}", path.display(), e))?,
        None => Pdfium::bind_to_system_library()
            .map_err(|e| anyhow!("PDFium not found. Place pdfium.dll in resources/pdfium/: {}", e))?,
    };
    Ok(Pdfium::new(bindings))
}

// ── Data types ──

#[derive(Debug, Clone, serde::Serialize)]
pub struct PdfLayer {
    pub id: String,
    pub name: String,
    pub visible: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PageInfo {
    pub index: usize,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct PageOrganizationItem {
    pub kind: String,
    #[serde(default)]
    pub original_index: Option<usize>,
    #[serde(default)]
    pub image_path: Option<String>,
    #[serde(default)]
    pub width: Option<f64>,
    #[serde(default)]
    pub height: Option<f64>,
}

/// Info about a single page object (image, text, path, etc.)
#[derive(Debug, Clone, serde::Serialize)]
pub struct PageObjectInfo {
    pub index: usize,
    pub object_type: String,
    pub bounds: Option<[f64; 4]>,
    pub image_width: Option<u32>,
    pub image_height: Option<u32>,
    pub text_content: Option<String>,
    pub font_size: Option<f64>,
    /// Children object indices (for form XObjects / groups)
    pub children: Vec<usize>,
    /// Parent object index (0 = root / no parent)
    pub parent_index: Option<usize>,
}

/// An extracted image with its base64-encoded data
#[derive(Debug, Clone, serde::Serialize)]
pub struct ExtractedImage {
    pub object_index: usize,
    pub width: u32,
    pub height: u32,
    /// base64 PNG data URI
    pub data: String,
}

#[derive(Debug, Clone, Copy)]
pub enum ImageFormat {
    Png,
    Jpeg,
    WebP,
}

fn bounds_overlap(bounds_a: [f64; 4], bounds_b: [f64; 4], padding: f64) -> bool {
    !(bounds_a[2] + padding < bounds_b[0]
        || bounds_b[2] + padding < bounds_a[0]
        || bounds_a[3] + padding < bounds_b[1]
        || bounds_b[3] + padding < bounds_a[1])
}

fn hide_text_in_form_object(
    object: &mut PdfPageObject<'_>,
    selected_text_bounds: &[[f64; 4]],
    hide_all_text: bool,
) {
    if object.object_type() == PdfPageObjectType::Text {
        let should_hide = if hide_all_text || selected_text_bounds.is_empty() {
            true
        } else if let Ok(b) = object.bounds() {
            let obj_bounds = [
                b.left().value as f64,
                b.bottom().value as f64,
                b.right().value as f64,
                b.top().value as f64,
            ];

            !selected_text_bounds.iter().any(|selected_bounds| {
                bounds_overlap(*selected_bounds, obj_bounds, 1.5)
            })
        } else {
            true
        };

        if should_hide {
            let _ = object.translate(PdfPoints::new(-100000.0), PdfPoints::new(-100000.0));
        }

        return;
    }

    if let Some(form_object) = object.as_x_object_form_object_mut() {
        for child_index in 0..form_object.len() {
            if let Ok(mut child) = form_object.get(child_index) {
                hide_text_in_form_object(&mut child, selected_text_bounds, hide_all_text);
            }
        }
    }
}

fn resize_image_if_needed(image: DynamicImage, width: Option<u32>, height: Option<u32>) -> DynamicImage {
    let target_width = width.unwrap_or_else(|| image.width()).max(1);
    let target_height = height.unwrap_or_else(|| image.height()).max(1);

    if target_width == image.width() && target_height == image.height() {
        return image;
    }

    image.resize_exact(target_width, target_height, image::imageops::FilterType::Lanczos3)
}

// ── PdfDocument ──

pub struct PdfDocument {
    path: PathBuf,
}

impl PdfDocument {
    fn save_lopdf_document(&self, mut doc: LopdfDocument, operation_label: &str) -> Result<PathBuf> {
        let temp_path = self.path.with_extension("pdf.tmp");
        doc.save(&temp_path)
            .map_err(|e| {
                let _ = std::fs::remove_file(&temp_path);
                anyhow!("Failed to save PDF after {}: {}", operation_label, e)
            })?;

        std::fs::rename(&temp_path, &self.path)
            .map_err(|e| anyhow!("Failed to replace original PDF: {}", e))?;

        Ok(self.path.clone())
    }

    fn save_verified_lopdf_document(
        &self,
        mut doc: LopdfDocument,
        operation_label: &str,
    ) -> Result<PathBuf> {
        let temp_path = self.path.with_extension("pdf.tmp");
        doc.save(&temp_path)
            .map_err(|e| {
                let _ = std::fs::remove_file(&temp_path);
                anyhow!("Failed to save PDF after {}: {}", operation_label, e)
            })?;

        match get_pdfium() {
            Ok(pdfium) => {
                if let Err(e) = pdfium.load_pdf_from_file(&temp_path, None) {
                    let _ = std::fs::remove_file(&temp_path);
                    return Err(anyhow!(
                        "{} produced a corrupt PDF (original preserved): {}",
                        operation_label,
                        e
                    ));
                }
            }
            Err(e) => {
                let _ = std::fs::remove_file(&temp_path);
                return Err(anyhow!("Cannot verify PDF (PDFium unavailable): {}", e));
            }
        }

        std::fs::rename(&temp_path, &self.path)
            .map_err(|e| anyhow!("Failed to replace original PDF: {}", e))?;

        Ok(self.path.clone())
    }

    fn create_blank_page_in_document(
        &self,
        doc: &mut LopdfDocument,
        pages_id: ObjectId,
        width: f32,
        height: f32,
    ) -> Result<(ObjectId, f64, f64)> {
        let blank_page_dict = dictionary! {
            "Type" => "Page",
            "MediaBox" => vec![
                lopdf::Object::Integer(0),
                lopdf::Object::Integer(0),
                lopdf::Object::Real(width),
                lopdf::Object::Real(height),
            ],
            "Contents" => lopdf::Object::Stream(lopdf::Stream::new(
                dictionary! {},
                Vec::new(),
            )),
        };

        let new_page_id = doc.add_object(blank_page_dict);

        if let Ok(page_obj) = doc.get_object_mut(new_page_id).and_then(|o| o.as_dict_mut()) {
            page_obj.set("Parent", lopdf::Object::Reference(pages_id));
        }

        Ok((new_page_id, width as f64, height as f64))
    }

    fn create_image_page_in_document(
        &self,
        doc: &mut LopdfDocument,
        pages_id: ObjectId,
        image_path: impl AsRef<Path>,
    ) -> Result<(ObjectId, f64, f64)> {
        let image_path = image_path.as_ref();
        if !image_path.exists() {
            return Err(anyhow!("Image file does not exist: {:?}", image_path));
        }

        let img = image::open(image_path)
            .map_err(|e| anyhow!("Failed to open image {:?}: {}", image_path, e))?;
        let img_w = img.width() as f64;
        let img_h = img.height() as f64;

        let max_dim = 2000.0;
        let scale = if img_w > max_dim || img_h > max_dim {
            (max_dim / img_w).min(max_dim / img_h)
        } else if img_w < 72.0 && img_h < 72.0 {
            200.0 / img_w.max(img_h)
        } else {
            1.0
        };
        let page_w = (img_w * scale) as f32;
        let page_h = (img_h * scale) as f32;

        let rgb_img = img.to_rgb8();
        let mut jpeg_buf = Vec::new();
        {
            let mut cursor = std::io::Cursor::new(&mut jpeg_buf);
            rgb_img
                .write_to(&mut cursor, image::ImageFormat::Jpeg)
                .map_err(|e| anyhow!("Failed to encode image as JPEG: {}", e))?;
        }

        let img_stream = lopdf::Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => lopdf::Object::Integer(img_w as i64),
                "Height" => lopdf::Object::Integer(img_h as i64),
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => lopdf::Object::Integer(8),
                "Filter" => "DCTDecode",
                "Length" => lopdf::Object::Integer(jpeg_buf.len() as i64),
            },
            jpeg_buf,
        );
        let img_obj_id = doc.add_object(lopdf::Object::Stream(img_stream));

        let resources_dict = dictionary! {
            "XObject" => dictionary! {
                "Img0" => lopdf::Object::Reference(img_obj_id),
            },
        };

        let content = format!(
            "q\n{:.2} 0 0 {:.2} 0 0 cm\n/Img0 Do\nQ\n",
            page_w, page_h
        );
        let content_stream = lopdf::Stream::new(dictionary! {}, content.into_bytes());
        let content_id = doc.add_object(lopdf::Object::Stream(content_stream));

        let page_dict = dictionary! {
            "Type" => "Page",
            "MediaBox" => vec![
                lopdf::Object::Integer(0),
                lopdf::Object::Integer(0),
                lopdf::Object::Real(page_w),
                lopdf::Object::Real(page_h),
            ],
            "Contents" => lopdf::Object::Reference(content_id),
            "Resources" => resources_dict,
        };
        let new_page_id = doc.add_object(page_dict);

        if let Ok(page_obj) = doc.get_object_mut(new_page_id).and_then(|o| o.as_dict_mut()) {
            page_obj.set("Parent", lopdf::Object::Reference(pages_id));
        }

        Ok((new_page_id, page_w as f64, page_h as f64))
    }

    pub fn load(path: impl AsRef<Path>) -> Result<Self> {
        let path = path.as_ref().to_path_buf();
        if !path.exists() {
            return Err(anyhow!("PDF file not found: {:?}", path));
        }
        Ok(PdfDocument { path })
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    // ── Layers: multi-strategy extraction ──

    pub fn get_layers(&self) -> Result<Vec<PdfLayer>> {
        let mut layers = Vec::new();

        // Strategy 1: Try lopdf (works for well-formed PDFs)
        if let Ok(doc) = LopdfDocument::load(&self.path) {
            self.extract_ocg_layers_lopdf(&doc, &mut layers);
        }

        // Strategy 2: Raw byte scanning (works for linearized / non-standard PDFs)
        if layers.is_empty() {
            self.extract_ocg_layers_raw(&mut layers);
        }

        // Fallback: single content layer
        if layers.is_empty() {
            layers.push(PdfLayer {
                id: "content".to_string(),
                name: "Content".to_string(),
                visible: true,
            });
        }

        Ok(layers)
    }

    /// Strategy 1: Parse OCG layers via lopdf's structured API
    fn extract_ocg_layers_lopdf(&self, doc: &LopdfDocument, layers: &mut Vec<PdfLayer>) {
        let catalog = match doc.catalog() {
            Ok(d) => d,
            Err(_) => return,
        };
        let oc_props = match catalog.get(b"OCProperties") {
            Ok(v) => v,
            Err(_) => return,
        };

        let oc_dict = if let Ok(r) = oc_props.as_reference() {
            doc.get_dictionary(r).ok()
        } else {
            oc_props.as_dict().ok()
        };

        let oc_dict = match oc_dict {
            Some(d) => d,
            None => return,
        };

        let ocgs = match oc_dict.get(b"OCGs") {
            Ok(v) => v,
            Err(_) => return,
        };

        let arr = match ocgs.as_array() {
            Ok(a) => a,
            Err(_) => return,
        };

        for (idx, item) in arr.iter().enumerate() {
            if let Ok(ocg_ref) = item.as_reference() {
                if let Ok(ocg_dict) = doc.get_dictionary(ocg_ref) {
                    let name = ocg_dict
                        .get(b"Name")
                        .ok()
                        .and_then(|v| v.as_str().ok())
                        .map(|s| String::from_utf8_lossy(s).to_string())
                        .unwrap_or_else(|| format!("Layer {}", idx + 1));

                    layers.push(PdfLayer {
                        id: format!("ocg_{}", idx),
                        name,
                        visible: true,
                    });
                }
            }
        }
    }

    /// Strategy 2: Scan raw PDF bytes for OCG definitions.
    /// Works on any PDF regardless of xref structure.
    /// Looks for `/Type /OCG` dictionaries and extracts their `/Name` values.
    fn extract_ocg_layers_raw(&self, layers: &mut Vec<PdfLayer>) {
        let mut data = Vec::new();
        if File::open(&self.path)
            .and_then(|mut f| f.read_to_end(&mut data))
            .is_err()
        {
            return;
        }

        let mut seen_names = HashSet::new();
        let type_ocg = b"/Type /OCG";
        let type_ocg_alt = b"/Type/OCG";

        // Find all positions of /Type /OCG or /Type/OCG
        let positions: Vec<usize> = (0..data.len().saturating_sub(type_ocg.len()))
            .filter(|&i| {
                data[i..].starts_with(type_ocg) || data[i..].starts_with(type_ocg_alt)
            })
            .collect();

        for pos in positions {
            // Search backwards for `<<` to find dict start
            let dict_start = data[..pos].iter().rposition(|&b| b == b'<')
                .and_then(|i| if i > 0 && data[i - 1] == b'<' { Some(i - 1) } else { None });
            // Search forwards for `>>` to find dict end
            let search_end = (pos + 500).min(data.len());
            let dict_end = data[pos..search_end].windows(2)
                .position(|w| w == b">>")
                .map(|i| pos + i + 2);

            if let (Some(start), Some(end)) = (dict_start, dict_end) {
                if let Some(name) = Self::extract_name_from_dict(&data[start..end]) {
                    if !name.is_empty() && seen_names.insert(name.clone()) {
                        layers.push(PdfLayer {
                            id: format!("ocg_{}", layers.len()),
                            name,
                            visible: true,
                        });
                    }
                }
            }
        }
    }

    /// Extract the /Name value from a raw PDF dictionary byte slice.
    /// Handles both literal strings `(Name)` and hex strings `<4E616D65>`.
    fn extract_name_from_dict(dict: &[u8]) -> Option<String> {
        let name_key = b"/Name";
        let pos = dict.windows(name_key.len())
            .position(|w| w == name_key)?;
        let after = &dict[pos + name_key.len()..];

        // Skip whitespace
        let after = after.iter()
            .position(|&b| b != b' ' && b != b'\r' && b != b'\n' && b != b'\t')
            .map(|i| &after[i..])?;

        if after.starts_with(b"(") {
            // Literal string: find matching closing paren (handle nesting)
            let mut depth = 0i32;
            let mut end = None;
            for (i, &b) in after.iter().enumerate() {
                match b {
                    b'(' => depth += 1,
                    b')' => {
                        depth -= 1;
                        if depth == 0 {
                            end = Some(i);
                            break;
                        }
                    }
                    _ => {}
                }
            }
            let end = end?;
            let raw = &after[1..end];

            // Try UTF-16BE (starts with BOM 0xFE 0xFF)
            if raw.len() >= 2 && raw[0] == 0xFE && raw[1] == 0xFF {
                let utf16: Vec<u16> = raw[2..].chunks(2)
                    .filter(|c| c.len() == 2)
                    .map(|c| u16::from_be_bytes([c[0], c[1]]))
                    .collect();
                String::from_utf16(&utf16).ok()
            } else {
                Some(String::from_utf8_lossy(raw).to_string())
            }
        } else if after.starts_with(b"<") {
            // Hex string
            let end = after.iter().position(|&b| b == b'>')?;
            let hex_str: String = after[1..end].iter()
                .filter(|b| !b.is_ascii_whitespace())
                .map(|&b| b as char)
                .collect();
            let bytes: Vec<u8> = (0..hex_str.len())
                .step_by(2)
                .filter_map(|i| hex_str.get(i..i + 2).and_then(|s| u8::from_str_radix(s, 16).ok()))
                .collect();
            Some(String::from_utf8_lossy(&bytes).to_string())
        } else {
            None
        }
    }

    // ── Page info ──

    pub fn get_pages(&self) -> Result<Vec<PageInfo>> {
        let pdfium = get_pdfium()?;
        let document = pdfium
            .load_pdf_from_file(&self.path, None)
            .map_err(|e| anyhow!("Failed to load PDF: {}", e))?;

        let page_count = document.pages().len();
        let mut pages = Vec::with_capacity(page_count as usize);

        for i in 0..page_count {
            match document.pages().get(i) {
                Ok(page) => {
                    pages.push(PageInfo {
                        index: i as usize,
                        width: page.width().value as f64,
                        height: page.height().value as f64,
                    });
                }
                Err(e) => {
                    eprintln!("Warning: skipping page {} (could not read: {})", i, e);
                }
            }
        }

        if pages.is_empty() && page_count > 0 {
            return Err(anyhow!("PDF appears corrupted: {} pages reported but none readable", page_count));
        }

        Ok(pages)
    }

    // ── Rendering ──

    pub fn render_page_to_image(
        &self,
        page_index: usize,
        width: u32,
        _height: u32,
        _active_layers: Vec<String>,
        hidden_object_indices: &[usize],
    ) -> Result<DynamicImage> {
        let pdfium = get_pdfium()?;
        let document = pdfium
            .load_pdf_from_file(&self.path, None)
            .map_err(|e| anyhow!("Failed to load PDF: {}", e))?;

        let page = document.pages().get(page_index as u16)
            .map_err(|e| anyhow!("Failed to get page {}: {}", page_index, e))?;

        if !hidden_object_indices.is_empty() {
            let hidden: HashSet<usize> = hidden_object_indices.iter().copied().collect();
            for (idx, mut obj) in page.objects().iter().enumerate() {
                if hidden.contains(&idx) {
                    let _ = obj.translate(PdfPoints::new(-100000.0), PdfPoints::new(-100000.0));
                }
            }
        }

        let render_page = page
            .render_with_config(
                &PdfRenderConfig::new().set_target_width(width as i32),
            )
            .map_err(|e| anyhow!("Failed to render page: {}", e))?;

        Ok(render_page.as_image())
    }

    /// Render a small thumbnail
    pub fn render_thumbnail(&self, page_index: usize, thumb_width: u32) -> Result<DynamicImage> {
        self.render_page_to_image(page_index, thumb_width, 0, vec![], &[])
    }

    pub fn render_page_to_file(
        &self,
        page_index: usize,
        output_path: impl AsRef<Path>,
        width: u32,
        height: u32,
        format: ImageFormat,
    ) -> Result<()> {
        let image = self.render_page_to_image(page_index, width, height, vec![], &[])?;
        match format {
            ImageFormat::Png => image.save_with_format(&output_path, image::ImageFormat::Png)?,
            ImageFormat::Jpeg => image.save_with_format(&output_path, image::ImageFormat::Jpeg)?,
            ImageFormat::WebP => {
                let rgba = image.to_rgba8();
                let encoder = webp::Encoder::from_rgba(&rgba, rgba.width(), rgba.height());
                let webp_data = encoder.encode(75.0);
                let mut file = File::create(output_path)?;
                file.write_all(&webp_data)?;
            }
        }
        Ok(())
    }

    pub fn page_count(&self) -> usize {
        get_pdfium().ok().and_then(|pdfium| {
            pdfium.load_pdf_from_file(&self.path, None).ok().map(|d| d.pages().len() as usize)
        }).unwrap_or(0)
    }

    pub fn get_metadata(&self) -> Result<serde_json::Value> {
        let pdfium = get_pdfium()?;
        let document = pdfium
            .load_pdf_from_file(&self.path, None)
            .map_err(|e| anyhow!("Failed to load PDF: {}", e))?;

        Ok(serde_json::json!({
            "page_count": document.pages().len(),
            "file_path": self.path.to_string_lossy(),
        }))
    }

    // ── Page manipulation via lopdf ──

    pub fn apply_page_organization(&self, items: &[PageOrganizationItem]) -> Result<Vec<PageInfo>> {
        if items.is_empty() {
            return Err(anyhow!("Page organization cannot be empty"));
        }

        let mut doc = LopdfDocument::load(&self.path)
            .map_err(|e| anyhow!("Failed to parse PDF: {}", e))?;

        let pages_id = doc.catalog()
            .map_err(|e| anyhow!("No catalog: {}", e))?
            .get(b"Pages")
            .map_err(|e| anyhow!("No Pages ref: {}", e))?
            .as_reference()
            .map_err(|e| anyhow!("Pages not a ref: {}", e))?;

        let mut page_ids: Vec<(u32, lopdf::ObjectId)> = doc.get_pages().into_iter().collect();
        page_ids.sort_by_key(|(num, _)| *num);
        let ordered_ids: Vec<lopdf::ObjectId> = page_ids.into_iter().map(|(_, id)| id).collect();

        let (default_width, default_height) = self.first_page_size().unwrap_or((595.0, 842.0));
        let mut new_kids = Vec::with_capacity(items.len());
        let mut refreshed_pages = Vec::with_capacity(items.len());

        for (page_index, item) in items.iter().enumerate() {
            match item.kind.as_str() {
                "existing" => {
                    let original_index = item
                        .original_index
                        .ok_or_else(|| anyhow!("Existing page item is missing original_index"))?;
                    let page_id = ordered_ids.get(original_index).ok_or_else(|| {
                        anyhow!("Existing page index {} is out of bounds", original_index)
                    })?;
                    new_kids.push(lopdf::Object::Reference(*page_id));
                    refreshed_pages.push(PageInfo {
                        index: page_index,
                        width: item.width.unwrap_or(default_width),
                        height: item.height.unwrap_or(default_height),
                    });
                }
                "blank" => {
                    let blank_width = item.width.unwrap_or(default_width) as f32;
                    let blank_height = item.height.unwrap_or(default_height) as f32;
                    let (page_id, page_width, page_height) = self.create_blank_page_in_document(
                        &mut doc,
                        pages_id,
                        blank_width,
                        blank_height,
                    )?;
                    new_kids.push(lopdf::Object::Reference(page_id));
                    refreshed_pages.push(PageInfo {
                        index: page_index,
                        width: page_width,
                        height: page_height,
                    });
                }
                "image" => {
                    let image_path = item
                        .image_path
                        .as_ref()
                        .ok_or_else(|| anyhow!("Image page item is missing image_path"))?;
                    let (page_id, page_width, page_height) =
                        self.create_image_page_in_document(&mut doc, pages_id, image_path)?;
                    new_kids.push(lopdf::Object::Reference(page_id));
                    refreshed_pages.push(PageInfo {
                        index: page_index,
                        width: page_width,
                        height: page_height,
                    });
                }
                other => {
                    return Err(anyhow!("Unsupported page organization item kind: {}", other));
                }
            }
        }

        if let Ok(pages_dict) = doc.get_object_mut(pages_id).and_then(|o| o.as_dict_mut()) {
            pages_dict.set("Kids", lopdf::Object::Array(new_kids));
            pages_dict.set("Count", lopdf::Object::Integer(items.len() as i64));
        }

        self.save_lopdf_document(doc, "apply page organization")?;
        Ok(refreshed_pages)
    }

    /// Delete pages by indices (0-based). Saves safely via temp file to prevent corruption.
    pub fn delete_pages(&self, page_indices: &[usize]) -> Result<PathBuf> {
        let mut doc = LopdfDocument::load(&self.path)
            .map_err(|e| anyhow!("Failed to parse PDF: {}", e))?;

        // lopdf uses 1-based page numbers. Delete from highest to lowest
        let mut to_delete: Vec<u32> = page_indices.iter().map(|&i| (i + 1) as u32).collect();
        to_delete.sort_unstable();
        to_delete.dedup();
        to_delete.reverse();

        for page_num in to_delete {
            doc.delete_pages(&[page_num]);
        }

        self.save_verified_lopdf_document(doc, "deleting pages")
    }

    /// Reorder pages. `new_order` is 0-based indices in desired order.
    pub fn reorder_pages(&self, new_order: &[usize]) -> Result<PathBuf> {
        let mut doc = LopdfDocument::load(&self.path)
            .map_err(|e| anyhow!("Failed to parse PDF: {}", e))?;

        let page_count = doc.get_pages().len();
        if new_order.len() != page_count {
            return Err(anyhow!(
                "new_order length ({}) doesn't match page count ({})",
                new_order.len(), page_count
            ));
        }

        let mut page_ids: Vec<(u32, lopdf::ObjectId)> = doc.get_pages().into_iter().collect();
        page_ids.sort_by_key(|(num, _)| *num);
        let ordered_ids: Vec<lopdf::ObjectId> = page_ids.into_iter().map(|(_, id)| id).collect();

        let new_kids: Vec<lopdf::Object> = new_order
            .iter()
            .map(|&i| lopdf::Object::Reference(ordered_ids[i]))
            .collect();

        let pages_id = doc.catalog()
            .map_err(|e| anyhow!("No catalog: {}", e))?
            .get(b"Pages")
            .map_err(|e| anyhow!("No Pages ref: {}", e))?
            .as_reference()
            .map_err(|e| anyhow!("Pages not a ref: {}", e))?;

        if let Ok(pages_dict) = doc.get_object_mut(pages_id).and_then(|o| o.as_dict_mut()) {
            pages_dict.set("Kids", lopdf::Object::Array(new_kids));
            pages_dict.set("Count", lopdf::Object::Integer(new_order.len() as i64));
        }

        self.save_verified_lopdf_document(doc, "reordering pages")
    }

    /// Insert a blank page at `position` (0-based).
    pub fn insert_blank_page(&self, position: usize) -> Result<PathBuf> {
        let mut doc = LopdfDocument::load(&self.path)
            .map_err(|e| anyhow!("Failed to parse PDF: {}", e))?;

        let (w, h) = self.first_page_size().unwrap_or((595.0, 842.0));
        let w = w as f32;
        let h = h as f32;

        let pages_id = doc.catalog()
            .map_err(|e| anyhow!("No catalog: {}", e))?
            .get(b"Pages")
            .map_err(|e| anyhow!("No Pages ref: {}", e))?
            .as_reference()
            .map_err(|e| anyhow!("Pages not a ref: {}", e))?;

        let (new_page_id, _, _) = self.create_blank_page_in_document(&mut doc, pages_id, w, h)?;

        if let Ok(pages_dict) = doc.get_object_mut(pages_id).and_then(|o| o.as_dict_mut()) {
            let count = pages_dict
                .get(b"Count")
                .and_then(|c| c.as_i64())
                .unwrap_or(0);

            let mut kids = pages_dict
                .get(b"Kids")
                .and_then(|k| k.as_array())
                .cloned()
                .unwrap_or_default();

            let insert_at = position.min(kids.len());
            kids.insert(insert_at, lopdf::Object::Reference(new_page_id));

            pages_dict.set("Kids", lopdf::Object::Array(kids));
            pages_dict.set("Count", lopdf::Object::Integer(count + 1));
        }

        self.save_verified_lopdf_document(doc, "inserting a blank page")
    }

    /// Insert an image file as a new PDF page at `position`.
    /// The image is embedded as a JPEG XObject and the page is sized to the image dimensions
    /// (scaled to fit within reasonable PDF page bounds).
    pub fn insert_image_as_page(&self, image_path: impl AsRef<Path>, position: usize) -> Result<PathBuf> {
        let mut doc = LopdfDocument::load(&self.path)
            .map_err(|e| anyhow!("Failed to parse PDF: {}", e))?;

        let pages_id = doc.catalog()
            .map_err(|e| anyhow!("No catalog: {}", e))?
            .get(b"Pages")
            .map_err(|e| anyhow!("No Pages ref: {}", e))?
            .as_reference()
            .map_err(|e| anyhow!("Pages not a ref: {}", e))?;

        let (new_page_id, _, _) = self.create_image_page_in_document(&mut doc, pages_id, image_path)?;

        if let Ok(pages_dict) = doc.get_object_mut(pages_id).and_then(|o| o.as_dict_mut()) {
            let count = pages_dict
                .get(b"Count")
                .and_then(|c| c.as_i64())
                .unwrap_or(0);

            let mut kids = pages_dict
                .get(b"Kids")
                .and_then(|k| k.as_array())
                .cloned()
                .unwrap_or_default();

            let insert_at = position.min(kids.len());
            kids.insert(insert_at, lopdf::Object::Reference(new_page_id));

            pages_dict.set("Kids", lopdf::Object::Array(kids));
            pages_dict.set("Count", lopdf::Object::Integer(count + 1));
        }

        self.save_verified_lopdf_document(doc, "inserting an image page")
    }

    fn first_page_size(&self) -> Option<(f64, f64)> {
        let pdfium = get_pdfium().ok()?;
        let doc = pdfium.load_pdf_from_file(&self.path, None).ok()?;
        let page = doc.pages().get(0).ok()?;
        Some((page.width().value as f64, page.height().value as f64))
    }

    // ── Page object enumeration ──

    /// List all objects on a page with their type and bounds.
    /// Text objects are grouped into line-level blocks with actual text content.
    pub fn get_page_objects(&self, page_index: usize) -> Result<Vec<PageObjectInfo>> {
        let pdfium = get_pdfium()?;
        let document = pdfium
            .load_pdf_from_file(&self.path, None)
            .map_err(|e| anyhow!("Failed to load PDF: {}", e))?;

        let page = document.pages().get(page_index as u16)
            .map_err(|e| anyhow!("Failed to get page {}: {}", page_index, e))?;

        let mut objects = Vec::new();

        // Use the page-level text chars API for reliable text extraction.
        // The page text API (FPDFText_LoadPage) properly resolves font encodings /
        // ToUnicode CMaps, unlike per-object .text() which often returns gibberish
        // for PDFs with subsetted or custom fonts.
        // We iterate over page.text().chars() to get correctly decoded characters
        // with their individual bounds, then group them into line-level blocks.

        // Intermediate struct for text char collection
        struct RawCharItem {
            ch: char,
            bounds: Option<[f64; 4]>, // None for whitespace without valid bounds
            font_size: f64,
        }
        let mut raw_chars: Vec<RawCharItem> = Vec::new();

        if let Ok(page_text) = page.text() {
            for ch in page_text.chars().iter() {
                let is_generated = ch.is_generated().unwrap_or(false);
                if let Some(c) = ch.unicode_char() {
                    let u = c as u32;
                    // Skip null and replacement chars
                    if u == 0 || u == 0xFFFD {
                        continue;
                    }
                    // Skip non-whitespace control chars
                    if u < 32 && !matches!(c, ' ' | '\t' | '\n' | '\r') {
                        continue;
                    }
                    // For generated chars, only keep whitespace (word/line separators)
                    if is_generated && !c.is_whitespace() {
                        continue;
                    }

                    let bounds = ch.loose_bounds().ok().and_then(|b| {
                        let rect = [
                            b.left().value as f64,
                            b.bottom().value as f64,
                            b.right().value as f64,
                            b.top().value as f64,
                        ];
                        // Zero-size bounds aren't useful
                        if (rect[2] - rect[0]).abs() < 0.001 && (rect[3] - rect[1]).abs() < 0.001 {
                            None
                        } else {
                            Some(rect)
                        }
                    });

                    let font_size = ch.scaled_font_size().value as f64;
                    raw_chars.push(RawCharItem {
                        ch: c,
                        bounds,
                        font_size,
                    });
                }
            }
        }

        for (idx, obj) in page.objects().iter().enumerate() {
            match obj.object_type() {
                PdfPageObjectType::Text => {
                    // Text objects are handled via the page text chars API above;
                    // skip them in the per-object loop.
                }
                _ => {
                    let object_type = match obj.object_type() {
                        PdfPageObjectType::Path => "path",
                        PdfPageObjectType::Image => "image",
                        PdfPageObjectType::Shading => "shading",
                        PdfPageObjectType::XObjectForm => "form",
                        _ => "unsupported",
                    }.to_string();

                    let bounds = obj.bounds().ok().map(|b| {
                        [b.left().value as f64, b.bottom().value as f64, b.right().value as f64, b.top().value as f64]
                    });

                    let (image_width, image_height) = if let Some(img_obj) = obj.as_image_object() {
                        (Some(img_obj.width().unwrap_or_default() as u32), Some(img_obj.height().unwrap_or_default() as u32))
                    } else {
                        (None, None)
                    };

                    objects.push(PageObjectInfo {
                        index: idx,
                        object_type,
                        bounds,
                        image_width,
                        image_height,
                        text_content: None,
                        font_size: None,
                        children: Vec::new(),
                        parent_index: None,
                    });
                }
            }
        }

        // Group chars into line-level text blocks.
        // PDFium's chars() API returns characters in reading order, including
        // generated whitespace (spaces between words, newlines between lines).
        if !raw_chars.is_empty() {
            let mut group_idx = 0usize;
            let mut current_bounds: Option<[f64; 4]> = None;
            let mut current_text = String::new();
            let mut current_font_size = 0.0f64;

            let flush = |objects: &mut Vec<PageObjectInfo>, text: &str, bounds: &Option<[f64; 4]>, font_size: f64, gidx: &mut usize| {
                if !text.trim().is_empty() {
                    if let Some(b) = bounds {
                        objects.push(PageObjectInfo {
                            index: 100_000 + *gidx,
                            object_type: "text".to_string(),
                            bounds: Some(*b),
                            image_width: None,
                            image_height: None,
                            text_content: Some(text.trim().to_string()),
                            font_size: Some(font_size),
                            children: Vec::new(),
                            parent_index: None,
                        });
                        *gidx += 1;
                    }
                }
            };

            for item in &raw_chars {
                // Newline/CR → flush current group
                if item.ch == '\n' || item.ch == '\r' {
                    flush(&mut objects, &current_text, &current_bounds, current_font_size, &mut group_idx);
                    current_text.clear();
                    current_bounds = None;
                    current_font_size = 0.0;
                    continue;
                }

                // Space/tab → add space to current text, don't update bounds
                if item.ch == ' ' || item.ch == '\t' {
                    if !current_text.is_empty() && !current_text.ends_with(' ') {
                        current_text.push(' ');
                    }
                    continue;
                }

                // Regular character — check whether it belongs on the current line
                if let Some(char_bounds) = item.bounds {
                    if let Some(ref cur_b) = current_bounds {
                        let char_height = (char_bounds[3] - char_bounds[1]).max(0.5);
                        let cur_height = (cur_b[3] - cur_b[1]).max(0.5);
                        // Use the SMALLER height so mixed-size lines don't over-merge
                        let ref_height = char_height.min(cur_height);
                        let threshold_y = ref_height * 0.5;
                        let threshold_x = cur_height.max(char_height) * 3.0;

                        let same_line = (cur_b[3] - char_bounds[3]).abs() < threshold_y
                            || (cur_b[1] - char_bounds[1]).abs() < threshold_y;
                        let close_x = char_bounds[0] - cur_b[2] < threshold_x;

                        if same_line && close_x {
                            // Fallback gap-based space (for PDFs without generated spaces)
                            let gap = char_bounds[0] - cur_b[2];
                            if gap > ref_height * 0.3 && !current_text.ends_with(' ') {
                                current_text.push(' ');
                            }
                            // Expand bounds
                            current_bounds = Some([
                                cur_b[0].min(char_bounds[0]),
                                cur_b[1].min(char_bounds[1]),
                                cur_b[2].max(char_bounds[2]),
                                cur_b[3].max(char_bounds[3]),
                            ]);
                        } else {
                            // Different line — flush and start new group
                            flush(&mut objects, &current_text, &current_bounds, current_font_size, &mut group_idx);
                            current_bounds = Some(char_bounds);
                            current_text = String::new();
                            current_font_size = 0.0;
                        }
                    } else {
                        // First char with bounds in this group
                        current_bounds = Some(char_bounds);
                    }
                    current_text.push(item.ch);
                    if item.font_size > current_font_size {
                        current_font_size = item.font_size;
                    }
                } else {
                    // Char without bounds — just append to text
                    current_text.push(item.ch);
                }
            }
            // Push last group
            flush(&mut objects, &current_text, &current_bounds, current_font_size, &mut group_idx);
        }

        // Build parent/child relationships: form XObjects contain smaller objects
        // An object is a child of a form if its bounds are fully within the form's bounds
        let form_indices: Vec<usize> = objects.iter()
            .enumerate()
            .filter(|(_, o)| o.object_type == "form" && o.bounds.is_some())
            .map(|(i, _)| i)
            .collect();

        for &fi in &form_indices {
            let form_bounds = objects[fi].bounds.unwrap();
            let form_obj_index = objects[fi].index;
            let mut child_indices = Vec::new();

            for (ci, child) in objects.iter().enumerate() {
                if ci == fi { continue; }
                if child.parent_index.is_some() { continue; }
                if let Some(cb) = child.bounds {
                    // Check if child bounds are contained within form bounds (with small tolerance)
                    let tol = 1.0;
                    if cb[0] >= form_bounds[0] - tol && cb[1] >= form_bounds[1] - tol
                        && cb[2] <= form_bounds[2] + tol && cb[3] <= form_bounds[3] + tol
                        && child.index != form_obj_index
                    {
                        child_indices.push((ci, child.index));
                    }
                }
            }

            // Apply parent/child links
            let children_obj_indices: Vec<usize> = child_indices.iter().map(|(_, oi)| *oi).collect();
            objects[fi].children = children_obj_indices;
            for (ci, _) in child_indices {
                objects[ci].parent_index = Some(form_obj_index);
            }
        }

        Ok(objects)
    }

    /// Extract all embedded images from a specific page.
    /// Returns a list of images with base64-encoded PNG data.
    pub fn extract_page_images(&self, page_index: usize) -> Result<Vec<ExtractedImage>> {
        let pdfium = get_pdfium()?;
        let document = pdfium
            .load_pdf_from_file(&self.path, None)
            .map_err(|e| anyhow!("Failed to load PDF: {}", e))?;

        let page = document.pages().get(page_index as u16)
            .map_err(|e| anyhow!("Failed to get page {}: {}", page_index, e))?;

        let mut images = Vec::new();
        for (idx, obj) in page.objects().iter().enumerate() {
            if let Some(img_obj) = obj.as_image_object() {
                // Try raw image first, fall back to processed
                let dyn_image = img_obj.get_raw_image()
                    .or_else(|_| img_obj.get_processed_image(&document));

                if let Ok(image) = dyn_image {
                    let w = image.width();
                    let h = image.height();
                    let mut buf = Vec::new();
                    image.write_to(
                        &mut std::io::Cursor::new(&mut buf),
                        image::ImageFormat::Png,
                    ).map_err(|e| anyhow!("Failed to encode image: {}", e))?;

                    let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
                    images.push(ExtractedImage {
                        object_index: idx,
                        width: w,
                        height: h,
                        data: format!("data:image/png;base64,{}", b64),
                    });
                }
            }
        }

        Ok(images)
    }

    /// Extract a single image by object index from a page and save it to a file.
    pub fn save_extracted_image(
        &self,
        page_index: usize,
        object_index: usize,
        output_path: impl AsRef<Path>,
        format: ImageFormat,
    ) -> Result<()> {
        let pdfium = get_pdfium()?;
        let document = pdfium
            .load_pdf_from_file(&self.path, None)
            .map_err(|e| anyhow!("Failed to load PDF: {}", e))?;

        let page = document.pages().get(page_index as u16)
            .map_err(|e| anyhow!("Failed to get page {}: {}", page_index, e))?;

        let obj = page.objects().iter().nth(object_index)
            .ok_or_else(|| anyhow!("Object index {} not found on page {}", object_index, page_index))?;

        let img_obj = obj.as_image_object()
            .ok_or_else(|| anyhow!("Object {} is not an image", object_index))?;

        let image = img_obj.get_raw_image()
            .or_else(|_| img_obj.get_processed_image(&document))
            .map_err(|e| anyhow!("Failed to extract image: {}", e))?;

        match format {
            ImageFormat::Png => image.save_with_format(&output_path, image::ImageFormat::Png)?,
            ImageFormat::Jpeg => image.save_with_format(&output_path, image::ImageFormat::Jpeg)?,
            ImageFormat::WebP => {
                let rgba = image.to_rgba8();
                let encoder = webp::Encoder::from_rgba(&rgba, rgba.width(), rgba.height());
                let webp_data = encoder.encode(75.0);
                let mut file = File::create(output_path)?;
                file.write_all(&webp_data)?;
            }
        }
        Ok(())
    }

    /// Export a selected region of a page as an image.
    /// `bounds` is [left, bottom, right, top] in PDF points.
    /// If `hide_text` is true, text objects are hidden before rendering.
    /// If `transparent_bg` is true, the background is transparent; otherwise white.
    pub fn render_selected_region_image(
        &self,
        page_index: usize,
        bounds: [f64; 4],
        hide_text: bool,
        transparent_bg: bool,
        selected_object_indices: &[usize],
        selected_form_object_indices: &[usize],
        hidden_object_indices: &[usize],
        selected_text_bounds: &[[f64; 4]],
        hide_unselected_text: bool,
        resize_width: Option<u32>,
        resize_height: Option<u32>,
    ) -> Result<DynamicImage> {
        let pdfium = get_pdfium()?;
        let document = pdfium
            .load_pdf_from_file(&self.path, None)
            .map_err(|e| anyhow!("Failed to load PDF: {}", e))?;

        let page = document.pages().get(page_index as u16)
            .map_err(|e| anyhow!("Failed to get page {}: {}", page_index, e))?;

        let selected_keep = if selected_object_indices.is_empty() {
            None
        } else {
            Some(selected_object_indices.iter().copied().collect::<HashSet<usize>>())
        };

        if let Some(keep) = &selected_keep {
            for (idx, mut obj) in page.objects().iter().enumerate() {
                if hide_unselected_text && obj.object_type() == PdfPageObjectType::Text {
                    continue;
                }
                if !keep.contains(&idx) {
                    let _ = obj.translate(PdfPoints::new(-100000.0), PdfPoints::new(-100000.0));
                }
            }

            if hide_unselected_text || hide_text {
                let selected_forms: HashSet<usize> = selected_form_object_indices.iter().copied().collect();
                for (idx, mut obj) in page.objects().iter().enumerate() {
                    if !keep.contains(&idx) || !selected_forms.contains(&idx) || obj.object_type() != PdfPageObjectType::XObjectForm {
                        continue;
                    }

                    hide_text_in_form_object(&mut obj, selected_text_bounds, hide_text);
                }
            }
        }

        if selected_object_indices.is_empty() && !selected_form_object_indices.is_empty() && (hide_unselected_text || hide_text) {
            let selected_forms: HashSet<usize> = selected_form_object_indices.iter().copied().collect();
            for (idx, mut obj) in page.objects().iter().enumerate() {
                if !selected_forms.contains(&idx) || obj.object_type() != PdfPageObjectType::XObjectForm {
                    continue;
                }

                hide_text_in_form_object(&mut obj, selected_text_bounds, hide_text);
            }
        }

        if !hidden_object_indices.is_empty() {
            let hidden: HashSet<usize> = hidden_object_indices.iter().copied().collect();
            for (idx, mut obj) in page.objects().iter().enumerate() {
                if hidden.contains(&idx) {
                    let _ = obj.translate(PdfPoints::new(-100000.0), PdfPoints::new(-100000.0));
                }
            }
        }

        if hide_unselected_text {
            for mut obj in page.objects().iter() {
                if obj.object_type() != PdfPageObjectType::Text {
                    continue;
                }

                let should_hide = if selected_text_bounds.is_empty() {
                    true
                } else if let Ok(b) = obj.bounds() {
                    let obj_bounds = [
                        b.left().value as f64,
                        b.bottom().value as f64,
                        b.right().value as f64,
                        b.top().value as f64,
                    ];

                    !selected_text_bounds.iter().any(|selected_bounds| {
                        bounds_overlap(*selected_bounds, obj_bounds, 1.5)
                    })
                } else {
                    true
                };

                if should_hide {
                    let _ = obj.translate(PdfPoints::new(-100000.0), PdfPoints::new(-100000.0));
                }
            }
        } else if hide_text {
            for mut obj in page.objects().iter() {
                if obj.object_type() == PdfPageObjectType::Text {
                    let _ = obj.translate(PdfPoints::new(-100000.0), PdfPoints::new(-100000.0));
                }
            }
        }

        let page_width = page.width().value as f64;
        let page_height = page.height().value as f64;

        let render_width = (page_width * 3.0) as i32;
        let mut render_config = PdfRenderConfig::new()
            .set_target_width(render_width);
        if transparent_bg {
            render_config = render_config.set_clear_color(PdfColor::new(0, 0, 0, 0));
        }
        let rendered = page.render_with_config(&render_config)
            .map_err(|e| anyhow!("Failed to render page: {}", e))?;
        let image = rendered.as_image();

        let img_w = image.width() as f64;
        let img_h = image.height() as f64;
        let scale_x = img_w / page_width;
        let scale_y = img_h / page_height;

        let [left, bottom, right, top] = bounds;
        let px_left = ((left * scale_x).max(0.0)) as u32;
        let px_top = (((page_height - top) * scale_y).max(0.0)) as u32;
        let px_w = (((right - left) * scale_x).max(1.0)) as u32;
        let px_h = (((top - bottom) * scale_y).max(1.0)) as u32;

        let px_left = px_left.min(image.width().saturating_sub(1));
        let px_top = px_top.min(image.height().saturating_sub(1));
        let px_w = px_w.min(image.width().saturating_sub(px_left));
        let px_h = px_h.min(image.height().saturating_sub(px_top));

        Ok(resize_image_if_needed(
            image.crop_imm(px_left, px_top, px_w, px_h),
            resize_width,
            resize_height,
        ))
    }

    pub fn export_selected_region(
        &self,
        page_index: usize,
        bounds: [f64; 4],
        output_path: impl AsRef<Path>,
        format: ImageFormat,
        hide_text: bool,
        transparent_bg: bool,
        selected_object_indices: &[usize],
        selected_form_object_indices: &[usize],
        hidden_object_indices: &[usize],
        selected_text_bounds: &[[f64; 4]],
        hide_unselected_text: bool,
        resize_width: Option<u32>,
        resize_height: Option<u32>,
    ) -> Result<()> {
        let cropped = self.render_selected_region_image(
            page_index,
            bounds,
            hide_text,
            transparent_bg,
            selected_object_indices,
            selected_form_object_indices,
            hidden_object_indices,
            selected_text_bounds,
            hide_unselected_text,
            resize_width,
            resize_height,
        )?;

        match format {
            ImageFormat::Png => cropped.save_with_format(&output_path, image::ImageFormat::Png)?,
            ImageFormat::Jpeg => cropped.save_with_format(&output_path, image::ImageFormat::Jpeg)?,
            ImageFormat::WebP => {
                let rgba = cropped.to_rgba8();
                let encoder = webp::Encoder::from_rgba(&rgba, rgba.width(), rgba.height());
                let webp_data = encoder.encode(90.0);
                let mut file = File::create(output_path)?;
                file.write_all(&webp_data)?;
            }
        }
        Ok(())
    }

    /// Crop a specific object's bounding box and return as base64 PNG.
    /// Used for drag-to-extract previews and quick exports.
    /// If `hide_text` is true, text objects are hidden before rendering.
    /// If `transparent_bg` is true, the background is transparent; otherwise white.
    pub fn export_object_cropped_base64(
        &self,
        page_index: usize,
        bounds: [f64; 4],
        hide_text: bool,
        transparent_bg: bool,
        selected_object_indices: &[usize],
    ) -> Result<String> {
        let pdfium = get_pdfium()?;
        let document = pdfium
            .load_pdf_from_file(&self.path, None)
            .map_err(|e| anyhow!("Failed to load PDF: {}", e))?;

        let page = document.pages().get(page_index as u16)
            .map_err(|e| anyhow!("Failed to get page {}: {}", page_index, e))?;

        // If explicit selection is provided, always hide ALL non-selected objects
        // so export contains only what the user selected (for both Transparent and As-is).
        // If no explicit selection is provided, keep legacy hide_text behavior.
        if !selected_object_indices.is_empty() {
            let keep: HashSet<usize> = selected_object_indices.iter().copied().collect();
            for (idx, mut obj) in page.objects().iter().enumerate() {
                if !keep.contains(&idx) {
                    let _ = obj.translate(PdfPoints::new(-100000.0), PdfPoints::new(-100000.0));
                }
            }
        } else if hide_text {
            for mut obj in page.objects().iter() {
                if obj.object_type() == PdfPageObjectType::Text {
                    let _ = obj.translate(PdfPoints::new(-100000.0), PdfPoints::new(-100000.0));
                }
            }
        }

        let page_width = page.width().value as f64;
        let page_height = page.height().value as f64;

        let render_width = (page_width * 3.0) as i32;
        let mut render_config = PdfRenderConfig::new()
            .set_target_width(render_width);
        if transparent_bg {
            render_config = render_config.set_clear_color(PdfColor::new(0, 0, 0, 0));
        }
        let rendered = page.render_with_config(&render_config)
            .map_err(|e| anyhow!("Failed to render page: {}", e))?;
        let image = rendered.as_image();

        let img_w = image.width() as f64;
        let img_h = image.height() as f64;
        let scale_x = img_w / page_width;
        let scale_y = img_h / page_height;

        let [left, bottom, right, top] = bounds;
        let px_left = ((left * scale_x).max(0.0)) as u32;
        let px_top = (((page_height - top) * scale_y).max(0.0)) as u32;
        let px_w = (((right - left) * scale_x).max(1.0)) as u32;
        let px_h = (((top - bottom) * scale_y).max(1.0)) as u32;

        let px_left = px_left.min(image.width().saturating_sub(1));
        let px_top = px_top.min(image.height().saturating_sub(1));
        let px_w = px_w.min(image.width().saturating_sub(px_left));
        let px_h = px_h.min(image.height().saturating_sub(px_top));

        let cropped = image.crop_imm(px_left, px_top, px_w, px_h);

        let mut buf = Vec::new();
        cropped.write_to(
            &mut std::io::Cursor::new(&mut buf),
            image::ImageFormat::Png,
        ).map_err(|e| anyhow!("Failed to encode cropped image: {}", e))?;

        let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
        Ok(format!("data:image/png;base64,{}", b64))
    }
}

