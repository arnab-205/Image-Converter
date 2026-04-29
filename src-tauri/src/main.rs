#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::fs;
use std::fs::File;
use std::io::{BufRead, BufReader, Cursor, Seek, Write};
use std::path::{Path, PathBuf};
use std::sync::mpsc::channel;
use std::sync::Mutex;
use std::thread; // Import the thread module
use tauri::command;
use tauri::{AppHandle, Emitter};
use tauri_plugin_dialog::{DialogExt, FilePath}; // Add Deserialize

use dirs;

// PDF Processing Modules
mod pdf_processor;
mod pdf_commands;
use pdf_commands::CurrentPdf;
use image::codecs::gif::GifDecoder;
use image::imageops::FilterType;
use image::{AnimationDecoder, ImageDecoder, ImageFormat};
use webp::Encoder;
use webp_animation::{
    Encoder as AnimEncoder, EncoderOptions as AnimEncoderOptions,
    EncodingConfig as AnimEncodingConfig,
};

const WEBP_MAX_DIMENSION: u32 = 16_383;
const THUMBNAIL_PREVIEW_LIMIT: usize = 30;

// Struct for the frontend to send a list of files
#[derive(Deserialize)]
struct ConversionJob {
    files: Vec<String>,
    format: String,
    bg_color: Option<String>,
}

// Struct for the backend to send progress updates
#[derive(Clone, serde::Serialize)]
struct ConversionPayload {
    status: String, // "processing", "success", "error", "complete"
    message: String,
    progress: u32, // Percentage 0-100
}

#[derive(Serialize)]
struct Thumbnail {
    path: PathBuf,
    name: String,
    data_url: String,
}

#[derive(Serialize)]
struct DropPreparation {
    folder_path: Option<String>,
    files: Vec<Thumbnail>,
}

fn emit_conversion_progress(app: &AppHandle, payload: ConversionPayload) {
    if let Err(err) = app.emit("conversion-progress", Some(payload)) {
        eprintln!("Failed to emit conversion-progress event: {err}");
    }
}

fn parse_bg_color(bg_color: Option<&str>) -> Result<Option<[u8; 3]>, String> {
    let Some(hex) = bg_color else {
        return Ok(None);
    };

    if hex.len() != 6 && hex.len() != 7 {
        return Err("Invalid hex color format".to_string());
    }

    let hex_clean = hex.trim_start_matches('#');
    let r = u8::from_str_radix(&hex_clean[0..2], 16)
        .map_err(|_| "Invalid hex color".to_string())?;
    let g = u8::from_str_radix(&hex_clean[2..4], 16)
        .map_err(|_| "Invalid hex color".to_string())?;
    let b = u8::from_str_radix(&hex_clean[4..6], 16)
        .map_err(|_| "Invalid hex color".to_string())?;

    Ok(Some([r, g, b]))
}

fn webp_target_dimensions(width: u32, height: u32) -> (u32, u32) {
    if width <= WEBP_MAX_DIMENSION && height <= WEBP_MAX_DIMENSION {
        return (width, height);
    }

    let scale = f64::min(
        WEBP_MAX_DIMENSION as f64 / width as f64,
        WEBP_MAX_DIMENSION as f64 / height as f64,
    );

    let resized_width = ((width as f64 * scale).round() as u32).clamp(1, WEBP_MAX_DIMENSION);
    let resized_height = ((height as f64 * scale).round() as u32).clamp(1, WEBP_MAX_DIMENSION);

    (resized_width, resized_height)
}

fn encode_webp_image(dyn_img: image::DynamicImage, filename: &str) -> Result<Vec<u8>, String> {
    let original_width = dyn_img.width();
    let original_height = dyn_img.height();
    let (target_width, target_height) = webp_target_dimensions(original_width, original_height);

    let webp_source = if (target_width, target_height) != (original_width, original_height) {
        eprintln!(
            "Resizing {filename} from {original_width}x{original_height} to {target_width}x{target_height} for WebP output"
        );
        dyn_img.resize(target_width, target_height, FilterType::Lanczos3)
    } else {
        dyn_img
    };

    let rgba_img = webp_source.to_rgba8();
    let encoder = Encoder::from_rgba(&rgba_img, rgba_img.width(), rgba_img.height());

    encoder
        .encode_simple(false, 75.0)
        .map(|webp_data| webp_data.to_vec())
        .map_err(|err| {
            format!(
                "Failed to encode WEBP for {filename}: {err:?}. Source dimensions: {original_width}x{original_height}"
            )
        })
}

fn is_gif_filename(filename: &str) -> bool {
    Path::new(filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .map_or(false, |ext| ext.eq_ignore_ascii_case("gif"))
}

fn is_supported_image_path(path: &Path) -> bool {
    path.is_file()
        && path
            .extension()
            .and_then(|s| s.to_str())
            .map_or(false, |ext| {
                matches!(
                    ext.to_ascii_lowercase().as_str(),
                    "png" | "jpg" | "jpeg" | "webp" | "gif"
                )
            })
}

fn preview_data_url_from_path(path: &Path) -> Option<String> {
    let img = image::open(path).ok()?;
    let preview = img.thumbnail(256, 256);
    let mut buf = Vec::new();
    if preview
        .write_to(&mut Cursor::new(&mut buf), ImageFormat::Png)
        .is_err()
    {
        return None;
    }

    let base64_str = general_purpose::STANDARD.encode(&buf);
    Some(format!("data:image/png;base64,{}", base64_str))
}

fn build_thumbnails(image_paths: Vec<PathBuf>) -> Vec<Thumbnail> {
    let should_generate_previews = image_paths.len() <= THUMBNAIL_PREVIEW_LIMIT;

    image_paths
        .into_iter()
        .filter_map(|path| {
            let name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            if should_generate_previews {
                Some(Thumbnail {
                    path: path.clone(),
                    name,
                    data_url: preview_data_url_from_path(&path)?,
                })
            } else {
                Some(Thumbnail {
                    path,
                    name,
                    data_url: String::new(),
                })
            }
        })
        .collect()
}

fn animated_webp_frame_delay_ms(delay: image::Delay, filename: &str) -> Result<i32, String> {
    let (numerator, denominator) = delay.numer_denom_ms();
    let frame_delay_ms =
        ((u64::from(numerator) + u64::from(denominator) - 1) / u64::from(denominator)).max(1);

    i32::try_from(frame_delay_ms)
        .map_err(|_| format!("GIF frame delay is too large to encode for {filename}"))
}

fn encode_animated_webp_from_gif_reader<R: BufRead + Seek>(
    reader: R,
    filename: &str,
) -> Result<Vec<u8>, String> {
    let decoder =
        GifDecoder::new(reader).map_err(|err| format!("Failed to decode GIF {filename}: {err}"))?;
    let (original_width, original_height) = decoder.dimensions();
    let (target_width, target_height) = webp_target_dimensions(original_width, original_height);
    let needs_resize = (target_width, target_height) != (original_width, original_height);

    if needs_resize {
        eprintln!(
            "Resizing animated GIF {filename} from {original_width}x{original_height} to {target_width}x{target_height} for WebP output"
        );
    }

    let mut encoder = AnimEncoder::new_with_options(
        (target_width, target_height),
        AnimEncoderOptions {
            encoding_config: Some(AnimEncodingConfig::new_lossy(75.0)),
            ..Default::default()
        },
    )
    .map_err(|err| format!("Failed to initialize animated WEBP encoder for {filename}: {err}"))?;

    let mut frame_count = 0usize;
    let mut timestamp_ms = 0i64;

    for frame_result in decoder.into_frames() {
        let frame = frame_result
            .map_err(|err| format!("Failed to read GIF animation frames for {filename}: {err}"))?;
        let frame_delay_ms = i64::from(animated_webp_frame_delay_ms(frame.delay(), filename)?);
        let frame_timestamp = i32::try_from(timestamp_ms)
            .map_err(|_| format!("GIF animation timeline is too long to encode for {filename}"))?;
        let rgba_frame = frame.into_buffer();
        let rgba_frame = if needs_resize {
            image::imageops::resize(
                &rgba_frame,
                target_width,
                target_height,
                FilterType::Lanczos3,
            )
        } else {
            rgba_frame
        };

        encoder
            .add_frame(rgba_frame.as_raw(), frame_timestamp)
            .map_err(|err| format!("Failed to encode GIF frame for {filename}: {err}"))?;

        timestamp_ms = timestamp_ms.saturating_add(frame_delay_ms);
        frame_count += 1;
    }

    if frame_count == 0 {
        return Err(format!(
            "GIF {filename} does not contain any animation frames"
        ));
    }

    let final_timestamp = i32::try_from(timestamp_ms.max(1))
        .map_err(|_| format!("GIF animation timeline is too long to encode for {filename}"))?;

    encoder
        .finalize(final_timestamp)
        .map(|webp_data| webp_data.to_vec())
        .map_err(|err| format!("Failed to finalize animated WEBP for {filename}: {err}"))
}

fn save_encoded_image(
    filename: &str,
    ext: &str,
    encoded_data: Vec<u8>,
    output_dir: PathBuf,
    is_batch: bool,
) -> Result<String, String> {
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output folder: {}", e))?;
    let base_name = filename.split('.').next().unwrap_or("converted");
    let output_filename = if is_batch {
        format!("{}.{}", base_name, ext)
    } else {
        format!("{}_converted.{}", base_name, ext)
    };
    let output_path = output_dir.join(output_filename);
    let mut output_file =
        File::create(&output_path).map_err(|e| format!("Failed to create output file: {}", e))?;
    output_file
        .write_all(&encoded_data)
        .map_err(|e| format!("Failed to write image: {}", e))?;

    Ok(output_path.to_string_lossy().to_string())
}

#[command]
fn select_folder_from_backend(app: AppHandle) -> Result<Option<PathBuf>, String> {
    let (sender, receiver) = channel();
    app.dialog()
        .file()
        .set_title("Select a folder")
        .pick_folder(move |folder_path: Option<FilePath>| {
            sender.send(folder_path).unwrap();
        });
    match receiver.recv() {
        Ok(path) => Ok(path.and_then(|p| p.as_path().map(|path_ref| path_ref.to_path_buf()))),
        Err(_) => Err("Failed to receive folder path from dialog".to_string()),
    }
}

#[command]
fn select_pdf_file(app: AppHandle) -> Result<Option<String>, String> {
    let (sender, receiver) = channel();
    app.dialog()
        .file()
        .set_title("Open PDF")
        .add_filter("PDF Files", &["pdf"])
        .pick_file(move |file_path: Option<FilePath>| {
            sender.send(file_path).unwrap();
        });
    match receiver.recv() {
        Ok(path) => Ok(path.and_then(|p| p.as_path().map(|path_ref| path_ref.to_string_lossy().to_string()))),
        Err(_) => Err("Failed to receive file path from dialog".to_string()),
    }
}

#[command]
fn get_image_thumbnails(folder_path: String) -> Result<Vec<Thumbnail>, String> {
    let image_paths: Vec<PathBuf> = fs::read_dir(&folder_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| is_supported_image_path(path))
        .collect();

    Ok(build_thumbnails(image_paths))
}

#[command]
fn prepare_drop(paths: Vec<String>) -> Result<DropPreparation, String> {
    let dropped_paths: Vec<PathBuf> = paths.into_iter().map(PathBuf::from).collect();

    if let Some(folder_path) = dropped_paths.iter().find(|path| path.is_dir()) {
        return Ok(DropPreparation {
            folder_path: Some(folder_path.to_string_lossy().to_string()),
            files: Vec::new(),
        });
    }

    let supported_files: Vec<PathBuf> = dropped_paths
        .into_iter()
        .filter(|path| is_supported_image_path(path))
        .collect();

    if supported_files.is_empty() {
        return Err("No supported image or GIF files were dropped.".to_string());
    }

    let thumbnails = build_thumbnails(supported_files);
    if thumbnails.is_empty() {
        return Err("Failed to load previews for the dropped files.".to_string());
    }

    Ok(DropPreparation {
        folder_path: None,
        files: thumbnails,
    })
}

#[command]
async fn convert_all_images(app: AppHandle, job: ConversionJob) -> Result<(), String> {
    thread::spawn(move || {
        let total_files = job.files.len();
        for (i, file_path) in job.files.iter().enumerate() {
            let progress = ((i + 1) as f32 / total_files as f32 * 100.0) as u32;
            let file_name = Path::new(file_path)
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            emit_conversion_progress(
                &app,
                ConversionPayload {
                    status: "processing".to_string(),
                    message: format!("Converting {}...", file_name),
                    progress,
                },
            );

            // Perform the conversion for one file
            let result = convert_image_from_path(
                file_path.clone(),
                job.format.clone(),
                job.bg_color.clone(),
            );

            match result {
                Ok(converted_path) => {
                    emit_conversion_progress(
                        &app,
                        ConversionPayload {
                            status: "success".to_string(),
                            message: format!("OK {} -> {}", file_name, converted_path),
                            progress,
                        },
                    );
                }
                Err(e) => {
                    emit_conversion_progress(
                        &app,
                        ConversionPayload {
                            status: "error".to_string(),
                            message: format!("ERROR {} - {}", file_name, e),
                            progress,
                        },
                    );
                }
            }
        }

        emit_conversion_progress(
            &app,
            ConversionPayload {
                status: "complete".to_string(),
                message: "All conversions finished.".to_string(),
                progress: 100,
            },
        );
    });

    Ok(())
}

#[command]
fn convert_image(
    file_bytes: Vec<u8>,
    filename: String,
    format: String,
    bg_color: Option<String>,
) -> Result<String, String> {
    let rgb_color = parse_bg_color(bg_color.as_deref())?;

    let desktop = dirs::desktop_dir().ok_or("Failed to find Desktop directory")?;
    let output_dir = desktop.join("ImageConverter");
    let format_guess = image::guess_format(&file_bytes)
        .map_err(|e| format!("Failed to guess image format: {}", e))?;

    if format_guess == ImageFormat::Gif {
        if format != "animated_webp" {
            return Err(
                "GIF files can only be converted with the Animated WEBP output option.".to_string(),
            );
        }

        let webp_data = encode_animated_webp_from_gif_reader(
            BufReader::new(Cursor::new(file_bytes)),
            &filename,
        )?;

        return save_encoded_image(&filename, "webp", webp_data, output_dir, false);
    }

    if format == "animated_webp" {
        return Err("Animated WEBP output is only supported for GIF input.".to_string());
    }

    let reader = Cursor::new(file_bytes);
    let dyn_img =
        image::load(reader, format_guess).map_err(|e| format!("Failed to load image: {}", e))?;
    process_and_save_image(dyn_img, filename, format, rgb_color, output_dir, false)
}

#[command]
fn convert_image_from_path(
    file_path: String,
    format: String,
    bg_color: Option<String>,
) -> Result<String, String> {
    let rgb_color = parse_bg_color(bg_color.as_deref())?;

    let path = Path::new(&file_path);
    let filename = path
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string();
    let source_dir = path
        .parent()
        .ok_or("Could not find parent directory of the image")?;
    let source_folder_name = source_dir
        .file_name()
        .ok_or("Could not get source folder name")?
        .to_string_lossy();
    let output_dir = source_dir.join(format!("{}_converted", source_folder_name));

    if is_gif_filename(&filename) {
        if format != "animated_webp" {
            return Err(
                "GIF files can only be converted with the Animated WEBP output option.".to_string(),
            );
        }

        let file =
            File::open(path).map_err(|e| format!("Failed to open GIF {}: {}", file_path, e))?;
        let webp_data = encode_animated_webp_from_gif_reader(BufReader::new(file), &filename)?;

        return save_encoded_image(&filename, "webp", webp_data, output_dir, true);
    }

    if format == "animated_webp" {
        return Err("Animated WEBP output is only supported for GIF input.".to_string());
    }

    let dyn_img =
        image::open(path).map_err(|e| format!("Failed to open image {}: {}", file_path, e))?;
    process_and_save_image(dyn_img, filename, format, rgb_color, output_dir, true)
}

#[command]
fn convert_single_image_from_path(
    file_path: String,
    format: String,
    bg_color: Option<String>,
) -> Result<String, String> {
    let rgb_color = parse_bg_color(bg_color.as_deref())?;

    let path = Path::new(&file_path);
    let filename = path
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string();
    let desktop = dirs::desktop_dir().ok_or("Failed to find Desktop directory")?;
    let output_dir = desktop.join("ImageConverter");

    if is_gif_filename(&filename) {
        if format != "animated_webp" {
            return Err(
                "GIF files can only be converted with the Animated WEBP output option."
                    .to_string(),
            );
        }

        let file =
            File::open(path).map_err(|e| format!("Failed to open GIF {}: {}", file_path, e))?;
        let webp_data = encode_animated_webp_from_gif_reader(BufReader::new(file), &filename)?;

        return save_encoded_image(&filename, "webp", webp_data, output_dir, false);
    }

    if format == "animated_webp" {
        return Err("Animated WEBP output is only supported for GIF input.".to_string());
    }

    let dyn_img =
        image::open(path).map_err(|e| format!("Failed to open image {}: {}", file_path, e))?;
    process_and_save_image(dyn_img, filename, format, rgb_color, output_dir, false)
}

fn process_and_save_image(
    dyn_img: image::DynamicImage,
    filename: String,
    format: String,
    rgb_color: Option<[u8; 3]>,
    output_dir: PathBuf,
    is_batch: bool,
) -> Result<String, String> {
    let (ext, encoded_data) = match format.as_str() {
        "jpg" | "jpeg" => {
            let rgba_img = dyn_img.to_rgba8();
            let has_alpha_pixels = rgba_img.pixels().any(|p| p[3] < 255);
            if has_alpha_pixels {
                if let Some(color) = rgb_color {
                    // Use the parsed RGB color
                    let mut background = image::RgbImage::new(dyn_img.width(), dyn_img.height());
                    for pixel in background.pixels_mut() {
                        *pixel = image::Rgb(color);
                    }

                    for (x, y, pixel) in rgba_img.enumerate_pixels() {
                        let alpha = pixel[3] as f32 / 255.0;
                        let bg_pixel = background.get_pixel_mut(x, y);
                        bg_pixel[0] =
                            ((1.0 - alpha) * bg_pixel[0] as f32 + alpha * pixel[0] as f32) as u8;
                        bg_pixel[1] =
                            ((1.0 - alpha) * bg_pixel[1] as f32 + alpha * pixel[1] as f32) as u8;
                        bg_pixel[2] =
                            ((1.0 - alpha) * bg_pixel[2] as f32 + alpha * pixel[2] as f32) as u8;
                    }

                    let mut buf = Vec::new();
                    image::DynamicImage::ImageRgb8(background)
                        .write_to(&mut Cursor::new(&mut buf), ImageFormat::Jpeg)
                        .map_err(|e| format!("Failed to write JPEG: {}", e))?;
                    ("jpg", buf)
                } else {
                    println!("It is going to default mode");
                    // If no background color is provided, use white as default for batch mode
                    if is_batch {
                        let default_color = [255, 255, 255]; // White
                        let mut background =
                            image::RgbImage::new(dyn_img.width(), dyn_img.height());
                        for pixel in background.pixels_mut() {
                            *pixel = image::Rgb(default_color);
                        }

                        for (x, y, pixel) in rgba_img.enumerate_pixels() {
                            let alpha = pixel[3] as f32 / 255.0;
                            let bg_pixel = background.get_pixel_mut(x, y);
                            bg_pixel[0] = ((1.0 - alpha) * bg_pixel[0] as f32
                                + alpha * pixel[0] as f32)
                                as u8;
                            bg_pixel[1] = ((1.0 - alpha) * bg_pixel[1] as f32
                                + alpha * pixel[1] as f32)
                                as u8;
                            bg_pixel[2] = ((1.0 - alpha) * bg_pixel[2] as f32
                                + alpha * pixel[2] as f32)
                                as u8;
                        }

                        let mut buf = Vec::new();
                        image::DynamicImage::ImageRgb8(background)
                            .write_to(&mut Cursor::new(&mut buf), ImageFormat::Jpeg)
                            .map_err(|e| format!("Failed to write JPEG: {}", e))?;
                        ("jpg", buf)
                    } else {
                        return Err("Image has transparency. Please provide a background color."
                            .to_string());
                    }
                }
            } else {
                let mut buf = Vec::new();
                dyn_img
                    .to_rgb8()
                    .write_to(&mut Cursor::new(&mut buf), ImageFormat::Jpeg)
                    .map_err(|e| format!("Failed to write JPEG: {}", e))?;
                ("jpg", buf)
            }
        }
        "png" => {
            let mut buf = Vec::new();
            dyn_img
                .write_to(&mut Cursor::new(&mut buf), ImageFormat::Png)
                .map_err(|e| format!("Failed to write PNG: {}", e))?;
            ("png", buf)
        }
        "webp" => {
            let webp_data = encode_webp_image(dyn_img, &filename)?;
            ("webp", webp_data)
        }
        _ => return Err("Unsupported output format".to_string()),
    };

    save_encoded_image(&filename, ext, encoded_data, output_dir, is_batch)
}

fn main() {
    let current_pdf = CurrentPdf(Mutex::new(None));

    tauri::Builder::default()
        .manage(current_pdf)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            convert_image,
            convert_single_image_from_path,
            prepare_drop,
            select_folder_from_backend,
            select_pdf_file,
            get_image_thumbnails,
            convert_all_images,
            // PDF handlers
            pdf_commands::pdf_load,
            pdf_commands::pdf_get_layers,
            pdf_commands::pdf_get_pages,
            pdf_commands::pdf_render_page,
            pdf_commands::pdf_get_thumbnails,
            pdf_commands::pdf_export_page,
            pdf_commands::pdf_get_metadata,
            pdf_commands::pdf_get_page_count,
            pdf_commands::pdf_unload,
            pdf_commands::pdf_delete_pages,
            pdf_commands::pdf_apply_page_organization,
            pdf_commands::pdf_reorder_pages,
            pdf_commands::pdf_insert_blank_page,
            pdf_commands::pdf_get_page_objects,
            pdf_commands::pdf_extract_page_images,
            pdf_commands::pdf_save_extracted_image,
            pdf_commands::pdf_export_selected_region,
            pdf_commands::pdf_preview_selected_region,
            pdf_commands::pdf_crop_object,
            pdf_commands::pdf_insert_image_as_page,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{
        convert_image_from_path, encode_animated_webp_from_gif_reader, process_and_save_image,
        webp_target_dimensions,
    };
    use gif::{Encoder as GifEncoder, Frame as GifFrame};
    use image::{DynamicImage, GenericImageView, ImageFormat, Rgba, RgbaImage};
    use std::fs;
    use std::io::{BufReader, Cursor};
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};
    use webp_animation::Decoder as WebpAnimDecoder;

    #[test]
    fn constrains_webp_dimensions_to_encoder_limit() {
        assert_eq!(webp_target_dimensions(640, 16_384), (640, 16_383));
        assert_eq!(webp_target_dimensions(16_384, 640), (16_383, 640));
        assert_eq!(webp_target_dimensions(1_240, 12_744), (1_240, 12_744));
    }

    #[test]
    fn converts_oversized_image_to_webp_without_panicking() {
        let image =
            DynamicImage::ImageRgba8(RgbaImage::from_pixel(1, 16_384, Rgba([255, 0, 0, 255])));
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time went backwards")
            .as_nanos();
        let output_dir = std::env::temp_dir().join(format!("image-converter-tauri-test-{nonce}"));

        fs::create_dir_all(&output_dir).expect("expected temp output dir to be created");

        let output = process_and_save_image(
            image,
            "oversized.png".to_string(),
            "webp".to_string(),
            None,
            output_dir.clone(),
            false,
        )
        .expect("expected oversized image to be resized and converted");

        let encoded = image::open(&output).expect("expected webp output to be readable");

        assert_eq!(encoded.dimensions(), (1, 16_383));
        assert!(Path::new(&output).exists(), "expected output file to exist");

        fs::remove_file(&output).expect("expected temp output file to be removable");
        fs::remove_dir_all(&output_dir).expect("expected temp output dir to be removable");
    }

    #[test]
    fn converts_gif_to_animated_webp_with_multiple_frames() {
        let mut gif_data = Vec::new();

        {
            let mut encoder =
                GifEncoder::new(&mut gif_data, 2, 1, &[]).expect("expected test gif encoder");

            let mut first_pixels = vec![255, 0, 0, 255, 0, 255, 0, 255];
            let mut first_frame = GifFrame::from_rgba_speed(2, 1, &mut first_pixels, 10);
            first_frame.delay = 5;
            encoder
                .write_frame(&first_frame)
                .expect("expected first gif frame");

            let mut second_pixels = vec![0, 0, 255, 255, 255, 255, 0, 255];
            let mut second_frame = GifFrame::from_rgba_speed(2, 1, &mut second_pixels, 10);
            second_frame.delay = 7;
            encoder
                .write_frame(&second_frame)
                .expect("expected second gif frame");
        }

        let animated_webp = encode_animated_webp_from_gif_reader(
            BufReader::new(Cursor::new(gif_data)),
            "animated.gif",
        )
        .expect("expected animated gif to convert to webp");

        let decoder = WebpAnimDecoder::new(&animated_webp).expect("expected animated webp");
        let frames: Vec<_> = decoder.into_iter().collect();

        assert_eq!(frames.len(), 2);
        assert_eq!(frames[0].dimensions(), (2, 1));
        assert_ne!(frames[0].data(), frames[1].data());
    }

    #[test]
    fn rejects_invalid_animated_webp_format_combinations() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time went backwards")
            .as_nanos();
        let work_dir =
            std::env::temp_dir().join(format!("image-converter-tauri-format-test-{nonce}"));
        fs::create_dir_all(&work_dir).expect("expected temp work dir to be created");

        let gif_path = work_dir.join("sample.gif");
        let mut gif_data = Vec::new();
        {
            let mut encoder =
                GifEncoder::new(&mut gif_data, 1, 1, &[]).expect("expected gif encoder");
            let mut pixels = vec![255, 0, 0, 255];
            let frame = GifFrame::from_rgba_speed(1, 1, &mut pixels, 10);
            encoder.write_frame(&frame).expect("expected gif frame");
        }
        fs::write(&gif_path, gif_data).expect("expected test gif to be written");

        let gif_err = convert_image_from_path(
            gif_path.to_string_lossy().to_string(),
            "webp".to_string(),
            None,
        )
        .expect_err("expected plain webp to reject gif input");
        assert!(
            gif_err.contains("Animated WEBP"),
            "unexpected gif error: {gif_err}"
        );

        let png_path = work_dir.join("sample.png");
        DynamicImage::ImageRgba8(RgbaImage::from_pixel(1, 1, Rgba([0, 0, 255, 255])))
            .save_with_format(&png_path, ImageFormat::Png)
            .expect("expected test png to be written");

        let png_err = convert_image_from_path(
            png_path.to_string_lossy().to_string(),
            "animated_webp".to_string(),
            None,
        )
        .expect_err("expected animated webp to reject non-gif input");
        assert!(
            png_err.contains("only supported for GIF input"),
            "unexpected png error: {png_err}"
        );

        fs::remove_file(&gif_path).expect("expected temp gif to be removable");
        fs::remove_file(&png_path).expect("expected temp png to be removable");
        fs::remove_dir_all(&work_dir).expect("expected temp work dir to be removable");
    }
}
