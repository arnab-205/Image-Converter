/// Tauri Commands for PDF Operations
use crate::pdf_processor::{ImageFormat, PdfDocument, PdfLayer, PageInfo, PageObjectInfo, ExtractedImage};
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

/// Stores the path of the currently loaded PDF.
/// PDF is loaded fresh per operation (pdfium types are !Send).
pub struct CurrentPdf(pub Mutex<Option<String>>);

// ── Request / Response types ──

#[derive(Serialize)]
pub struct LoadPdfResponse {
    pub success: bool,
    pub message: String,
    pub metadata: Option<serde_json::Value>,
    pub pages: Option<Vec<PageInfo>>,
}

#[derive(Deserialize)]
pub struct RenderPageRequest {
    pub page_index: usize,
    pub width: u32,
    pub height: u32,
    pub active_layers: Option<Vec<String>>,
    #[serde(default)]
    pub hidden_object_indices: Vec<usize>,
}

#[derive(Deserialize)]
pub struct ExportPageRequest {
    pub page_index: usize,
    pub output_path: String,
    pub width: u32,
    pub height: u32,
    pub format: String,
}

#[derive(Serialize)]
pub struct RenderResponse {
    pub success: bool,
    pub message: String,
    pub image_data: Option<String>,
}

#[derive(Serialize)]
pub struct ThumbnailItem {
    pub index: usize,
    pub data: String, // base64 JPEG data-uri
}

#[derive(Deserialize)]
pub struct SaveExtractedImageRequest {
    pub page_index: usize,
    pub object_index: usize,
    pub output_path: String,
    pub format: String,
}

#[derive(Deserialize)]
pub struct ExportSelectedRegionRequest {
    pub page_index: usize,
    pub bounds: [f64; 4],
    pub output_path: String,
    pub format: String,
    #[serde(default)]
    pub hide_text: bool,
    #[serde(default)]
    pub transparent_bg: bool,
    #[serde(default)]
    pub selected_object_indices: Vec<usize>,
}

#[derive(Deserialize)]
pub struct CropObjectRequest {
    pub page_index: usize,
    pub bounds: [f64; 4],
    #[serde(default)]
    pub hide_text: bool,
    #[serde(default)]
    pub transparent_bg: bool,
    #[serde(default)]
    pub selected_object_indices: Vec<usize>,
}

#[derive(Deserialize)]
pub struct InsertImageAsPageRequest {
    pub image_path: String,
    pub position: usize,
}

// ── Helpers ──

fn with_pdf<F, T>(state: &State<'_, CurrentPdf>, f: F) -> Result<T, String>
where
    F: FnOnce(&PdfDocument) -> Result<T, String>,
{
    // Recover from poisoned Mutex (previous panic) so exports don't freeze forever
    let lock = state.0.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    match &*lock {
        Some(path) => {
            let pdf = PdfDocument::load(path)
                .map_err(|e| format!("Failed to load PDF: {}", e))?;
            f(&pdf)
        }
        None => Err("No PDF loaded".to_string()),
    }
}

fn current_pdf_path(state: &State<'_, CurrentPdf>) -> Result<String, String> {
    let lock = state.0.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    lock.clone().ok_or_else(|| "No PDF loaded".to_string())
}

async fn with_pdf_blocking<F, T>(path: String, task: F) -> Result<T, String>
where
    F: FnOnce(PdfDocument) -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(move || {
        let pdf = PdfDocument::load(&path)
            .map_err(|e| format!("Failed to load PDF: {}", e))?;
        task(pdf)
    })
    .await
    .map_err(|e| format!("Background task failed: {}", e))?
}

fn encode_image_jpeg_base64(image: &image::DynamicImage) -> Result<String, String> {
    let mut buf = Vec::new();
    image
        .write_to(
            &mut std::io::Cursor::new(&mut buf),
            image::ImageFormat::Jpeg,
        )
        .map_err(|e| format!("Failed to encode JPEG: {}", e))?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
    Ok(format!("data:image/jpeg;base64,{}", b64))
}

fn encode_image_png_base64(image: &image::DynamicImage) -> Result<String, String> {
    let mut buf = Vec::new();
    image
        .write_to(
            &mut std::io::Cursor::new(&mut buf),
            image::ImageFormat::Png,
        )
        .map_err(|e| format!("Failed to encode PNG: {}", e))?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
    Ok(format!("data:image/png;base64,{}", b64))
}

// ── TAURI COMMANDS ──

#[tauri::command]
pub fn pdf_load(
    file_path: String,
    state: State<'_, CurrentPdf>,
) -> Result<LoadPdfResponse, String> {
    match PdfDocument::load(&file_path) {
        Ok(pdf) => {
            let metadata = pdf
                .get_metadata()
                .map_err(|e| format!("Failed to get metadata: {}", e))?;
            let pages = pdf
                .get_pages()
                .map_err(|e| format!("Failed to get pages: {}", e))?;

            *state.0.lock().unwrap_or_else(|p| p.into_inner()) = Some(file_path);

            Ok(LoadPdfResponse {
                success: true,
                message: "PDF loaded successfully".to_string(),
                metadata: Some(metadata),
                pages: Some(pages),
            })
        }
        Err(e) => Ok(LoadPdfResponse {
            success: false,
            message: format!("Failed to load PDF: {}", e),
            metadata: None,
            pages: None,
        }),
    }
}

#[tauri::command]
pub fn pdf_get_layers(state: State<'_, CurrentPdf>) -> Result<Vec<PdfLayer>, String> {
    with_pdf(&state, |pdf| {
        pdf.get_layers().map_err(|e| format!("Failed to get layers: {}", e))
    })
}

#[tauri::command]
pub fn pdf_get_pages(state: State<'_, CurrentPdf>) -> Result<Vec<PageInfo>, String> {
    with_pdf(&state, |pdf| {
        pdf.get_pages().map_err(|e| format!("Failed to get pages: {}", e))
    })
}

#[tauri::command]
pub fn pdf_render_page(
    request: RenderPageRequest,
    state: State<'_, CurrentPdf>,
) -> Result<RenderResponse, String> {
    with_pdf(&state, |pdf| {
        match pdf.render_page_to_image(
            request.page_index,
            request.width,
            request.height,
            request.active_layers.clone().unwrap_or_default(),
            &request.hidden_object_indices,
        ) {
            Ok(image) => {
                let data_uri = encode_image_png_base64(&image)?;
                Ok(RenderResponse {
                    success: true,
                    message: "Page rendered successfully".to_string(),
                    image_data: Some(data_uri),
                })
            }
            Err(e) => Ok(RenderResponse {
                success: false,
                message: format!("Failed to render page: {}", e),
                image_data: None,
            }),
        }
    })
}

/// Generate thumbnails for all pages (small JPEG, ~150px wide)
#[tauri::command]
pub fn pdf_get_thumbnails(
    thumb_width: Option<u32>,
    state: State<'_, CurrentPdf>,
) -> Result<Vec<ThumbnailItem>, String> {
    let width = thumb_width.unwrap_or(150);
    with_pdf(&state, |pdf| {
        let pages = pdf.get_pages().map_err(|e| format!("{}", e))?;
        let mut thumbnails = Vec::with_capacity(pages.len());
        for page_info in &pages {
            match pdf.render_thumbnail(page_info.index, width) {
                Ok(img) => {
                    let data_uri = encode_image_jpeg_base64(&img)?;
                    thumbnails.push(ThumbnailItem {
                        index: page_info.index,
                        data: data_uri,
                    });
                }
                Err(_) => {
                    // Placeholder for failed thumbnails
                    thumbnails.push(ThumbnailItem {
                        index: page_info.index,
                        data: String::new(),
                    });
                }
            }
        }
        Ok(thumbnails)
    })
}

#[tauri::command]
pub async fn pdf_export_page(
    request: ExportPageRequest,
    state: State<'_, CurrentPdf>,
) -> Result<bool, String> {
    let path = current_pdf_path(&state)?;
    let format = match request.format.to_lowercase().as_str() {
        "png" => ImageFormat::Png,
        "jpg" | "jpeg" => ImageFormat::Jpeg,
        "webp" => ImageFormat::WebP,
        _ => return Err(format!("Unsupported format: {}", request.format)),
    };

    with_pdf_blocking(path, move |pdf| {
        pdf.render_page_to_file(
            request.page_index,
            &request.output_path,
            request.width,
            request.height,
            format,
        )
        .map(|_| true)
        .map_err(|e| format!("Failed to export page: {}", e))
    })
    .await
}

#[tauri::command]
pub fn pdf_get_metadata(state: State<'_, CurrentPdf>) -> Result<serde_json::Value, String> {
    with_pdf(&state, |pdf| {
        pdf.get_metadata().map_err(|e| format!("Failed to get metadata: {}", e))
    })
}

#[tauri::command]
pub fn pdf_get_page_count(state: State<'_, CurrentPdf>) -> Result<usize, String> {
    with_pdf(&state, |pdf| Ok(pdf.page_count()))
}

#[tauri::command]
pub fn pdf_unload(state: State<'_, CurrentPdf>) {
    *state.0.lock().unwrap_or_else(|p| p.into_inner()) = None;
}

// ── Page management commands ──

/// Delete pages by 0-based indices. Returns refreshed page list.
#[tauri::command]
pub fn pdf_delete_pages(
    page_indices: Vec<usize>,
    state: State<'_, CurrentPdf>,
) -> Result<Vec<PageInfo>, String> {
    with_pdf(&state, |pdf| {
        pdf.delete_pages(&page_indices)
            .map_err(|e| format!("Failed to delete pages: {}", e))?;
        // Reload to get updated page list
        let refreshed = PdfDocument::load(pdf.path())
            .map_err(|e| format!("{}", e))?;
        refreshed.get_pages().map_err(|e| format!("{}", e))
    })
}

/// Reorder pages. `new_order` is 0-based indices in desired order.
/// Returns refreshed page list.
#[tauri::command]
pub fn pdf_reorder_pages(
    new_order: Vec<usize>,
    state: State<'_, CurrentPdf>,
) -> Result<Vec<PageInfo>, String> {
    with_pdf(&state, |pdf| {
        pdf.reorder_pages(&new_order)
            .map_err(|e| format!("Failed to reorder pages: {}", e))?;
        let refreshed = PdfDocument::load(pdf.path())
            .map_err(|e| format!("{}", e))?;
        refreshed.get_pages().map_err(|e| format!("{}", e))
    })
}

/// Insert a blank page at `position` (0-based). Returns refreshed page list.
#[tauri::command]
pub fn pdf_insert_blank_page(
    position: usize,
    state: State<'_, CurrentPdf>,
) -> Result<Vec<PageInfo>, String> {
    with_pdf(&state, |pdf| {
        pdf.insert_blank_page(position)
            .map_err(|e| format!("Failed to insert blank page: {}", e))?;
        let refreshed = PdfDocument::load(pdf.path())
            .map_err(|e| format!("{}", e))?;
        refreshed.get_pages().map_err(|e| format!("{}", e))
    })
}

// ── Image extraction commands ──

/// Get a list of all objects on a page (images, text, paths, etc.)
#[tauri::command]
pub fn pdf_get_page_objects(
    page_index: usize,
    state: State<'_, CurrentPdf>,
) -> Result<Vec<PageObjectInfo>, String> {
    with_pdf(&state, |pdf| {
        pdf.get_page_objects(page_index)
            .map_err(|e| format!("Failed to get page objects: {}", e))
    })
}

/// Extract all images embedded in a specific page.
/// Returns a list of images with base64-encoded PNG data.
#[tauri::command]
pub async fn pdf_extract_page_images(
    page_index: usize,
    state: State<'_, CurrentPdf>,
) -> Result<Vec<ExtractedImage>, String> {
    let path = current_pdf_path(&state)?;
    with_pdf_blocking(path, move |pdf| {
        pdf.extract_page_images(page_index)
            .map_err(|e| format!("Failed to extract images: {}", e))
    })
    .await
}

/// Save a single extracted image to disk.
#[tauri::command]
pub async fn pdf_save_extracted_image(
    request: SaveExtractedImageRequest,
    state: State<'_, CurrentPdf>,
) -> Result<bool, String> {
    let path = current_pdf_path(&state)?;
    let format = match request.format.to_lowercase().as_str() {
        "png" => ImageFormat::Png,
        "jpg" | "jpeg" => ImageFormat::Jpeg,
        "webp" => ImageFormat::WebP,
        _ => return Err(format!("Unsupported format: {}", request.format)),
    };

    with_pdf_blocking(path, move |pdf| {
        pdf.save_extracted_image(
            request.page_index,
            request.object_index,
            &request.output_path,
            format,
        )
        .map(|_| true)
        .map_err(|e| format!("Failed to save image: {}", e))
    })
    .await
}

/// Export a selected region of a page as an image (crop to union bounding box).
#[tauri::command]
pub async fn pdf_export_selected_region(
    request: ExportSelectedRegionRequest,
    state: State<'_, CurrentPdf>,
) -> Result<bool, String> {
    let path = current_pdf_path(&state)?;
    let format = match request.format.to_lowercase().as_str() {
        "png" => ImageFormat::Png,
        "jpg" | "jpeg" => ImageFormat::Jpeg,
        "webp" => ImageFormat::WebP,
        _ => return Err(format!("Unsupported format: {}", request.format)),
    };

    with_pdf_blocking(path, move |pdf| {
        pdf.export_selected_region(
            request.page_index,
            request.bounds,
            &request.output_path,
            format,
            request.hide_text,
            request.transparent_bg,
            &request.selected_object_indices,
        )
        .map(|_| true)
        .map_err(|e| format!("Failed to export region: {}", e))
    })
    .await
}

/// Crop a specific object's bounding box and return as base64 PNG (for drag-to-extract).
#[tauri::command]
pub async fn pdf_crop_object(
    request: CropObjectRequest,
    state: State<'_, CurrentPdf>,
) -> Result<String, String> {
    let path = current_pdf_path(&state)?;
    with_pdf_blocking(path, move |pdf| {
        pdf.export_object_cropped_base64(
            request.page_index,
            request.bounds,
            request.hide_text,
            request.transparent_bg,
            &request.selected_object_indices,
        )
        .map_err(|e| format!("Failed to crop object: {}", e))
    })
    .await
}

/// Insert an image file as a new PDF page at the specified position.
#[tauri::command]
pub fn pdf_insert_image_as_page(
    request: InsertImageAsPageRequest,
    state: State<'_, CurrentPdf>,
) -> Result<Vec<PageInfo>, String> {
    with_pdf(&state, |pdf| {
        pdf.insert_image_as_page(&request.image_path, request.position)
            .map_err(|e| format!("Failed to insert image as page: {}", e))?;
        pdf.get_pages().map_err(|e| format!("Failed to get pages: {}", e))
    })
}

