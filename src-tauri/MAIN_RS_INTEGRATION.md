/// INTEGRATION GUIDE for main.rs
/// 
/// Add the following to src-tauri/src/main.rs

// At the top of the file, add these module declarations:
/*
mod pdf_processor;
mod pdf_commands;

use pdf_commands::CurrentPdf;
use std::sync::Mutex;
*/

// In the main() function, before the tauri::Builder::default():
// Add this state initialization:
/*
let current_pdf = CurrentPdf(Mutex::new(None));
*/

// Then modify the tauri::Builder::default() to include:
/*
tauri::Builder::default()
    .manage(current_pdf)  // Add this line
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
        // ... existing handlers ...
        // Add these PDF handlers:
        pdf_commands::pdf_load,
        pdf_commands::pdf_get_layers,
        pdf_commands::pdf_get_pages,
        pdf_commands::pdf_render_page,
        pdf_commands::pdf_export_page,
        pdf_commands::pdf_get_metadata,
        pdf_commands::pdf_get_page_count,
        pdf_commands::pdf_unload,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
*/

// FULL EXAMPLE main.rs structure:
// ================================

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::fs;
use std::fs::File;
use std::io::{BufRead, BufReader, Cursor, Seek, Write};
use std::path::{Path, PathBuf};
use std::sync::mpsc::channel;
use std::sync::Mutex;
use std::thread;
use tauri::command;
use tauri::{AppHandle, Emitter};
use tauri_plugin_dialog::{DialogExt, FilePath};

use dirs;
use image::codecs::gif::GifDecoder;
use image::imageops::FilterType;
use image::{AnimationDecoder, ImageDecoder, ImageFormat};
use webp::Encoder;
use webp_animation::{
    Encoder as AnimEncoder, EncoderOptions as AnimEncoderOptions,
    EncodingConfig as AnimEncodingConfig,
};

// NEW: PDF Module imports
mod pdf_processor;
mod pdf_commands;
use pdf_commands::CurrentPdf;

// ... rest of your existing code and commands ...

fn main() {
    // NEW: Initialize PDF state
    let current_pdf = CurrentPdf(Mutex::new(None));

    tauri::Builder::default()
        .manage(current_pdf)  // NEW: Manage PDF state
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // ... your existing conversion commands ...
            // (e.g., convert_files, prepare_drop, etc.)
            
            // NEW: PDF handlers
            pdf_commands::pdf_load,
            pdf_commands::pdf_get_layers,
            pdf_commands::pdf_get_pages,
            pdf_commands::pdf_render_page,
            pdf_commands::pdf_export_page,
            pdf_commands::pdf_get_metadata,
            pdf_commands::pdf_get_page_count,
            pdf_commands::pdf_unload,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
