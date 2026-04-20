# Cargo.toml Dependencies Update

Add these dependencies to your `src-tauri/Cargo.toml` in the `[dependencies]` section:

```toml
# PDF Processing
pdfium-render = { version = "0.8", features = ["allow_invalid_cert"] }
lopdf = "34"

# Image processing (already present, but ensuring compatibility)
image = "0.25.8"

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# Logging
log = "0.4"
```

## Full Updated [dependencies] Section

```toml
[dependencies]
tauri = { version = "2.8.5", features = [] }
tauri-plugin-opener = "2.5.0"
tauri-plugin-dialog = "2.4.0"
tauri-plugin-fs = "2.4.2"
serde = { version = "1.0.226", features = ["derive"] }
serde_json = "1.0.145"
image = "0.25.8"
webp = "0.2.6"
dirs = "4.0.0"
base64 = "0.22.1"
gif = "0.12"
webp-animation = "0.7"

# NEW: PDF Processing
pdfium-render = { version = "0.8", features = ["allow_invalid_cert"] }
lopdf = "34"
anyhow = "1.0"
thiserror = "1.0"
log = "0.4"
```

## Build Dependencies
The `build-dependencies` section should already have `tauri-build`. No changes needed there.
