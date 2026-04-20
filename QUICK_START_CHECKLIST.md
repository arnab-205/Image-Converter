# Quick-Start Implementation Checklist

## Pre-implementation Checklist ✓

- [ ] Node.js/npm installed
- [ ] Rust toolchain installed (`rustup`)
- [ ] Tauri CLI installed (`cargo install tauri-cli`)
- [ ] Your project is a Tauri + React app (confirmed in workspace)
- [ ] Recent backup of your code

---

## Step 1: Update Dependencies (5 minutes)

### 1.1 Update Cargo.toml

**File**: `src-tauri/Cargo.toml`

Inside `[dependencies]` section, add:
```toml
pdfium-render = { version = "0.8", features = ["allow_invalid_cert"] }
lopdf = "34"
anyhow = "1.0"
thiserror = "1.0"
log = "0.4"
```

**Verification**: Run `cargo check` in `src-tauri/` directory

---

## Step 2: Add Rust Modules (10 minutes)

### 2.1 Copy Module Files

Copy these files to `src-tauri/src/`:
- `pdf_processor.rs` - Core PDF processing logic
- `pdf_commands.rs` - Tauri command handlers
- `pdf_advanced.rs` - Advanced OCG and manipulation (optional)

### 2.2 Integrate into main.rs

In `src-tauri/src/main.rs`, add at the top:

```rust
mod pdf_processor;
mod pdf_commands;
// mod pdf_advanced;  // Optional: uncomment when ready

use pdf_commands::CurrentPdf;
use std::sync::Mutex;
```

In the `main()` function, before `tauri::Builder::default()`:

```rust
let current_pdf = CurrentPdf(Mutex::new(None));
```

Update the `tauri::Builder::default()` call:

```rust
tauri::Builder::default()
    .manage(current_pdf)  // ADD THIS
    .plugin(tauri_plugin_opener::init())
    // ... other plugins ...
    .invoke_handler(tauri::generate_handler![
        // ... your existing handlers ...
        
        // ADD THESE PDF HANDLERS:
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
```

**Verification**: `cargo check` should pass with no errors

---

## Step 3: Set Up PDFium Bundling (15 minutes)

### 3.1 Create Resources Directory

```bash
# From project root
mkdir -p src-tauri/resources/pdfium
```

### 3.2 Download PDFium Binary

**For Windows (x86_64)**:
```bash
cd src-tauri/resources/pdfium
# Download from: https://github.com/paulocmarques/pdfium-render-rs/releases/download/v0.8.0/pdfium-windows_x64.zip
# Extract pdfium.dll to this directory
```

**For Linux (x86_64)**:
```bash
cd src-tauri/resources/pdfium
wget https://github.com/paulocmarques/pdfium-render-rs/releases/download/v0.8.0/pdfium-linux_x64.tar.gz
tar -xzf pdfium-linux_x64.tar.gz
mv lib/libpdfium.so .
rm -rf lib pdfium-linux_x64.tar.gz
```

**For macOS**:
```bash
cd src-tauri/resources/pdfium
curl -L -o pdfium-macos.zip https://github.com/paulocmarques/pdfium-render-rs/releases/download/v0.8.0/pdfium-macos_universal.zip
unzip pdfium-macos.zip
mv lib/libpdfium.dylib .
rm -rf lib pdfium-macos.zip
```

### 3.3 Verify Resources Structure

```
src-tauri/resources/pdfium/
├── pdfium.dll          (Windows) OR
├── libpdfium.so        (Linux) OR
└── libpdfium.dylib     (macOS)
```

### 3.4 Update tauri.conf.json

Replace `src-tauri/tauri.conf.json` with the provided `tauri_conf_updated.json`.

Key section must include:
```json
"bundle": {
  "resources": ["resources/**/*"],
  ...
}
```

**Verification**: File exists and is valid JSON

---

## Step 4: Add React Components (10 minutes)

### 4.1 Copy Component Files

Copy to `src/components/`:
- `PdfViewer.jsx` - Main PDF viewer component
- `PdfViewer.css` - Viewer styling
- `PdfPageManager.jsx` - Page management UI
- `PdfPageManager.css` - Manager styling

### 4.2 Integrate into App.jsx

Edit `src/App.jsx`:

```jsx
import PdfViewer from './components/PdfViewer';
import PdfPageManager from './components/PdfPageManager';

export default function App() {
  return (
    <main>
      {/* Your existing content */}
      
      {/* Add PDF components */}
      <PdfViewer />
      <PdfPageManager pages={[]} onPagesReordered={(order) => {}} />
    </main>
  );
}
```

---

## Step 5: Fix Required Imports (5 minutes)

### 5.1 Fix pdf_commands.rs Imports

In `src-tauri/src/pdf_commands.rs`, add missing imports at the top:

```rust
use base64::engine::general_purpose as base64_engine;
use std::io::Cursor;
```

### 5.2 Fix pdf_processor.rs Imports

In `src-tauri/src/pdf_processor.rs`, ensure:

```rust
use std::io::Write;
use webp::Encoder;
```

---

## Step 6: Initial Build & Test (10 minutes)

### 6.1 Development Build

```bash
# From project root
npm run tauri dev
```

**Expected Output**:
- App opens in dev window
- No Rust compilation errors
- React components render without errors

### 6.2 Quick Functionality Test

1. Click "Load PDF" button
2. Provide a PDF file path (or use a test PDF)
3. Verify metadata displays
4. Check that page renders
5. Try exporting a page

---

## Step 7: Production Build (5 minutes)

### 7.1 Create Release Build

```bash
npm run tauri build
```

**Output Location**:
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **Linux**: `src-tauri/target/release/bundle/appimage/`
- **macOS**: `src-tauri/target/release/bundle/macos/`

### 7.2 Verify Bundle

- [ ] Installer file exists
- [ ] File size is reasonable (~100-200MB including PDFium)
- [ ] Installer runs
- [ ] App launches without installing external software
- [ ] PDF features work in released app

---

## Common Issues & Fixes

### Issue: "Modules not found" errors

**Solution**:
```bash
cd src-tauri
cargo clean
cargo build
```

### Issue: "pdfium not found" at runtime

**Solution**:
- Verify `src-tauri/resources/pdfium/` contains the binary
- Check `tauri.conf.json` includes `"resources": ["resources/**/*"]`
- On Linux: Check file permissions: `chmod +x src-tauri/resources/pdfium/libpdfium.so`

### Issue: Compilation fails with "cannot find type `PdfDocument`"

**Solution**:
- Ensure `pdf_processor.rs` is copied correctly
- Check all imports in `main.rs` are present
- Run `cargo check` to see detailed errors

### Issue: Frontend buttons don't work

**Solution**:
- Check browser console for errors (F12)
- Verify Tauri commands are registered in `main.rs`
- Ensure `invoke()` calls match command names exactly

### Issue: Large bundle size

**Solution**: This is normal! PDFium is ~50-100MB. Use NSIS installer which compresses significantly.

---

## Testing Workflow

### Quick Test
```bash
npm run tauri dev
# Test in development window
```

### Build Test
```bash
npm run tauri build
# Test installed app on clean system
```

### Feature Validation

- [ ] Load PDF file
- [ ] Display page
- [ ] Navigate pages (previous/next)
- [ ] Toggle layers (if implemented)
- [ ] Export as PNG
- [ ] Export as JPG
- [ ] Export as WEBP
- [ ] View metadata
- [ ] Works offline (no external dependencies)

---

## File Checklist - Verify Existence

Before building, verify all these files exist:

```
Project Root/
├── src/
│   ├── components/
│   │   ├── PdfViewer.jsx             ✓
│   │   ├── PdfViewer.css             ✓
│   │   ├── PdfPageManager.jsx        ✓
│   │   └── PdfPageManager.css        ✓
│   └── App.jsx                       ✓ (updated)
│
└── src-tauri/
    ├── resources/
    │   └── pdfium/
    │       ├── pdfium.dll            ✓ (or .so/.dylib)
    │       └── (only 1, per platform)
    │
    ├── src/
    │   ├── main.rs                   ✓ (updated)
    │   ├── pdf_processor.rs          ✓
    │   ├── pdf_commands.rs           ✓
    │   └── pdf_advanced.rs           ✓ (optional)
    │
    ├── Cargo.toml                    ✓ (updated)
    ├── build.rs                      ✓ (unchanged usually)
    └── tauri.conf.json               ✓ (updated/replaced)
```

---

## Next Steps After Setup

1. **Enhance OCG Support**: Implement full layer visibility toggling
2. **Add Page Thumbnails**: Pre-render page previews
3. **Implement PDF Merging**: Full page addition/removal/reordering
4. **Add Batch Export**: Export multiple pages at once
5. **Performance**: Add threading for large documents
6. **Error Handling**: More granular error messages for UI

---

## Support Resources

- **Tauri Docs**: https://docs.tauri.app/
- **pdfium-render**: https://github.com/paulocmarques/pdfium-render-rs
- **React Documentation**: https://react.dev/

---

## Estimated Total Time
- **First-time setup**: 60-90 minutes
- **Subsequent builds**: 5-10 minutes
- **Production release**: 15-30 minutes

Good luck! 🚀
