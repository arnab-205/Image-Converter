import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import ChromeColorPicker from "./ColorPicker";
import UploadIcon from "./UploadIcon";

const THUMBNAIL_PREVIEW_LIMIT = 30;

const WORKFLOWS = {
  image: {
    title: "Images",
    description: "PNG, JPG, and WEBP conversions",
    singleLabel: "Single Image",
    multipleLabel: "Folder Images",
    accept: ".png,.jpg,.jpeg,.webp",
    acceptText: "PNG, JPG, WEBP",
  },
  gif: {
    title: "GIF",
    description: "GIF to Animated WEBP",
    singleLabel: "Single GIF",
    multipleLabel: "GIF Folder",
    accept: ".gif",
    acceptText: "GIF",
  },
};

const isGifFile = (name = "") => /\.gif$/i.test(name);
const isStaticImageFile = (name = "") => /\.(png|jpe?g|webp)$/i.test(name);

function ImageConverter({ onBack }) {
  const [workflow, setWorkflow] = useState("image");
  const [outputFormat, setOutputFormat] = useState("jpg");
  const [convertedPath, setConvertedPath] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [singleFilePreview, setSingleFilePreview] = useState("");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [hasAlpha, setHasAlpha] = useState(false);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const [batchSourceType, setBatchSourceType] = useState("folder");
  const [batchSourceLabel, setBatchSourceLabel] = useState("");
  const [folderImages, setFolderImages] = useState([]);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionLog, setConversionLog] = useState([]);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);

  const workflowMeta = WORKFLOWS[workflow];
  const isGifWorkflow = workflow === "gif";
  const activeOutputFormat = isGifWorkflow ? "animated_webp" : outputFormat;
  const selectedFileName = selectedFile?.name ?? "";
  const selectedFileIsGif = isGifFile(selectedFileName);
  const singleSelectionInvalid =
    !!selectedFile &&
    ((isGifWorkflow && !selectedFileIsGif) ||
      (!isGifWorkflow && selectedFileIsGif));

  const filteredFolderImages = folderImages.filter((image) =>
    isGifWorkflow ? isGifFile(image.name) : isStaticImageFile(image.name),
  );
  const ignoredFolderCount = folderImages.length - filteredFolderImages.length;
  const showFolderLoadedMessage =
    filteredFolderImages.length > THUMBNAIL_PREVIEW_LIMIT;

  useEffect(() => {
    const unlisten = listen("conversion-progress", (event) => {
      const payload = event.payload;
      setConversionProgress(payload.progress);
      setCurrentAction(payload.message);
      setConversionLog((prevLog) => [
        ...prevLog,
        { status: payload.status, message: payload.message },
      ]);
      if (payload.status === "complete") {
        setIsConverting(false);
        alert("Batch conversion complete!");
      }
    });

    return () => {
      unlisten.then((cleanup) => cleanup());
    };
  }, []);

  useEffect(() => {
    if (batchSourceType !== "folder") return;

    if (folderPath) {
      loadImagesFromFolder(folderPath);
      return;
    }

    setFolderImages([]);
  }, [batchSourceType, folderPath]);

  useEffect(() => {
    let unlistenDragDrop;

    getCurrentWebview()
      .onDragDropEvent(async (event) => {
        const payload = event.payload;

        if (payload.type === "enter" || payload.type === "over") {
          setIsWindowDragging(true);
          return;
        }

        if (payload.type === "leave") {
          setIsWindowDragging(false);
          return;
        }

        setIsWindowDragging(false);
        await handleDroppedPaths(payload.paths);
      })
      .then((cleanup) => {
        unlistenDragDrop = cleanup;
      })
      .catch((error) => {
        console.error("Failed to attach drag-and-drop listener:", error);
      });

    return () => {
      unlistenDragDrop?.();
    };
  }, []);

  useEffect(() => {
    if (!singleFilePreview.startsWith("blob:")) return undefined;
    return () => URL.revokeObjectURL(singleFilePreview);
  }, [singleFilePreview]);

  const resetConversionState = () => {
    setConvertedPath("");
    setConversionLog([]);
    setConversionProgress(0);
    setCurrentAction("");
  };

  const resetSingleSelection = () => {
    setSelectedFile(null);
    setSingleFilePreview("");
    setHasAlpha(false);
  };

  const resetBatchSelection = () => {
    setBatchSourceType("folder");
    setBatchSourceLabel("");
    setFolderPath("");
    setFolderImages([]);
  };

  const resetSelections = () => {
    resetConversionState();
    resetSingleSelection();
    resetBatchSelection();
    setIsDragging(false);
    setIsWindowDragging(false);
  };

  const loadImagesFromFolder = async (nextFolderPath) => {
    try {
      const imageThumbnails = await invoke("get_image_thumbnails", {
        folderPath: nextFolderPath,
      });
      setFolderImages(imageThumbnails);
    } catch (error) {
      console.error("Error reading folder:", error);
      alert("Failed to read folder contents: " + error);
    }
  };

  const selectFolder = async () => {
    try {
      const selected = await invoke("select_folder_from_backend");
      if (selected) {
        resetConversionState();
        resetSingleSelection();
        setBatchSourceType("folder");
        setBatchSourceLabel(selected);
        setFolderPath(selected);
      }
    } catch (error) {
      console.error("Error selecting folder:", error);
      alert("Error selecting folder: " + error);
    }
  };

  const inspectAlphaFromPreview = (previewUrl, filename) => {
    if (!previewUrl || isGifFile(filename)) return;

    setHasAlpha(false);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height).data;
      let alphaFound = false;
      for (let i = 3; i < imageData.length; i += 4) {
        if (imageData[i] < 255) {
          alphaFound = true;
          break;
        }
      }
      setHasAlpha(alphaFound);
    };
    img.src = previewUrl;
  };

  const processFile = (file) => {
    if (!file) return;

    resetConversionState();
    resetBatchSelection();
    setSelectedFile(file);

    const previewUrl = URL.createObjectURL(file);
    setSingleFilePreview(previewUrl);
    inspectAlphaFromPreview(previewUrl, file.name);
  };

  const processDroppedFile = (file) => {
    if (!file) return;

    resetConversionState();
    resetBatchSelection();
    setSelectedFile({
      name: file.name,
      path: file.path,
      source: "path",
    });
    setSingleFilePreview(file.data_url ?? "");
    inspectAlphaFromPreview(file.data_url, file.name);
  };

  const handleDroppedPaths = async (paths) => {
    if (!paths?.length) return;

    try {
      const dropResult = await invoke("prepare_drop", { paths });

      if (dropResult.folder_path) {
        resetConversionState();
        resetSingleSelection();
        setIsMultipleMode(true);
        setBatchSourceType("folder");
        setBatchSourceLabel(dropResult.folder_path);
        setFolderImages([]);
        setFolderPath(dropResult.folder_path);
        return;
      }

      if (dropResult.files.length === 1) {
        setIsMultipleMode(false);
        processDroppedFile(dropResult.files[0]);
        return;
      }

      resetConversionState();
      resetSingleSelection();
      setIsMultipleMode(true);
      setBatchSourceType("files");
      setBatchSourceLabel(
        `${dropResult.files.length} dropped file${dropResult.files.length > 1 ? "s" : ""}`,
      );
      setFolderPath("");
      setFolderImages(dropResult.files);
    } catch (error) {
      console.error("Error loading dropped items:", error);
      alert("Failed to load dropped items: " + error);
    }
  };

  const handleFileInput = (e) => {
    processFile(e.target.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const switchWorkflow = (nextWorkflow) => {
    if (nextWorkflow === workflow) return;
    setWorkflow(nextWorkflow);
    setIsMultipleMode(false);
    resetSelections();
  };

  const toggleMode = (newMode) => {
    if (newMode === isMultipleMode) return;
    setIsMultipleMode(newMode);
    resetSelections();
  };

  const convertSingleImage = async () => {
    if (!selectedFile || singleSelectionInvalid) return;

    setIsConverting(true);

    try {
      const bgColorValue =
        activeOutputFormat === "jpg" && hasAlpha
          ? bgColor.replace("#", "")
          : null;

      const path = selectedFile.path
        ? await invoke("convert_single_image_from_path", {
            filePath: selectedFile.path,
            format: activeOutputFormat,
            bgColor: bgColorValue,
          })
        : await invoke("convert_image", {
            fileBytes: Array.from(
              new Uint8Array(await selectedFile.arrayBuffer()),
            ),
            filename: selectedFile.name,
            format: activeOutputFormat,
            bgColor: bgColorValue,
          });

      setConvertedPath(path);
      alert(
        isGifWorkflow
          ? "Animated WEBP created successfully!"
          : "Image converted successfully!",
      );
    } catch (err) {
      alert("Conversion failed: " + err);
    } finally {
      setIsConverting(false);
    }
  };

  const convertMultipleImages = async () => {
    if (filteredFolderImages.length === 0) return;
    setIsConverting(true);
    setConversionLog([]);
    setConversionProgress(0);
    setCurrentAction("Starting batch conversion...");

    try {
      await invoke("convert_all_images", {
        job: {
          files: filteredFolderImages.map((img) => img.path),
          format: activeOutputFormat,
          bgColor: activeOutputFormat === "jpg" ? bgColor.replace("#", "") : null,
        },
      });
    } catch (error) {
      setIsConverting(false);
      alert("Batch conversion failed: " + error);
    }
  };

  const convertImage = () => {
    if (isMultipleMode) {
      convertMultipleImages();
    } else {
      convertSingleImage();
    }
  };

  const convertDisabled =
    isConverting ||
    (!isMultipleMode && (!selectedFile || singleSelectionInvalid)) ||
    (isMultipleMode && filteredFolderImages.length === 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-[2px] pointer-events-none">
          <div className="rounded-2xl border border-indigo-400/40 bg-slate-900/95 px-6 py-5 text-center shadow-2xl shadow-black/40">
            <p className="text-lg font-semibold text-slate-50">
              Drop files or folders
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Single files open in single mode. Folders or multiple files open
              in batch mode.
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 shadow-2xl shadow-black/20 rounded-2xl p-6 sm:p-10 max-w-3xl w-full space-y-8">
        {/* Back button + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
            title="Back to Home"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-slate-100">
            Image Converter
          </h1>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-300 border-b border-slate-700 pb-2">
            Choose Workflow
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => switchWorkflow("image")}
              className={`rounded-xl border p-4 text-left transition-colors ${
                workflow === "image"
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
              }`}
            >
              <p className="text-sm font-semibold text-slate-100">Images</p>
              <p className="mt-1 text-xs text-slate-400">
                PNG, JPG, WEBP conversions
              </p>
            </button>
            <button
              onClick={() => switchWorkflow("gif")}
              className={`rounded-xl border p-4 text-left transition-colors ${
                workflow === "gif"
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
              }`}
            >
              <p className="text-sm font-semibold text-slate-100">GIF</p>
              <p className="mt-1 text-xs text-slate-400">
                GIF to Animated WEBP
              </p>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-300 border-b border-slate-700 pb-2">
            1. Select {isGifWorkflow ? "GIF" : "Input"}
          </h2>
          <div className="flex bg-slate-900/50 p-1 rounded-lg">
            <button
              onClick={() => toggleMode(false)}
              className={`w-full px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-200 ${
                !isMultipleMode
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-700/50"
              }`}
            >
              {workflowMeta.singleLabel}
            </button>
            <button
              onClick={() => toggleMode(true)}
              className={`w-full px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-200 ${
                isMultipleMode
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-700/50"
              }`}
            >
              {workflowMeta.multipleLabel}
            </button>
          </div>

          {!isMultipleMode ? (
            <label
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`flex justify-center items-center w-full h-64 transition-colors duration-300 bg-slate-900/50 border-2 border-dashed rounded-lg appearance-none cursor-pointer hover:border-slate-600 focus:outline-none ${
                isDragging
                  ? "border-indigo-500 bg-slate-800"
                  : "border-slate-700"
              }`}
            >
              {singleFilePreview ? (
                <img
                  src={singleFilePreview}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain rounded-md p-2"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <UploadIcon />
                  <span className="font-medium text-slate-500">
                    Drop file or click to upload
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    {workflowMeta.acceptText}
                  </span>
                </div>
              )}
              <input
                type="file"
                accept={workflowMeta.accept}
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-4 py-3">
                <p className="text-sm text-slate-300">
                  Drop a folder or multiple {isGifWorkflow ? "GIFs" : "images"}{" "}
                  anywhere in the app.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  You can still browse folders manually if you prefer.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={selectFolder}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-lg text-sm font-semibold transition-colors"
                >
                  Browse Folders
                </button>
                {batchSourceLabel && (
                  <span className="text-xs text-slate-400 truncate flex-1">
                    {batchSourceLabel}
                  </span>
                )}
              </div>

              {batchSourceLabel && ignoredFolderCount > 0 && (
                <p className="text-xs text-amber-300">
                  {ignoredFolderCount} file{ignoredFolderCount > 1 ? "s" : ""} ignored because
                  they do not belong to the {workflowMeta.title} section.
                </p>
              )}

              {filteredFolderImages.length > 0 && (
                <div className="space-y-2">
                  {showFolderLoadedMessage ? (
                    <p className="text-sm font-semibold text-emerald-400">
                      {filteredFolderImages.length} files loaded successfully
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-slate-400">
                        {filteredFolderImages.length} files found
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-64 overflow-y-auto p-2 bg-slate-900/50 rounded-lg">
                        {filteredFolderImages.map((image) => (
                          <div
                            key={image.path}
                            title={image.name}
                            className="relative aspect-square rounded-md overflow-hidden group bg-slate-700"
                          >
                            <img
                              src={image.data_url}
                              alt={image.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                              <p
                                className="text-white text-[10px] leading-tight truncate"
                                title={image.name}
                              >
                                {image.name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {batchSourceLabel && filteredFolderImages.length === 0 && (
                <p className="text-sm text-amber-300">
                  No matching {isGifWorkflow ? "GIF" : "image"} files found in this{" "}
                  {batchSourceType === "files" ? "selection" : "folder"}.
                </p>
              )}
            </div>
          )}

          {singleSelectionInvalid && (
            <p className="text-sm text-amber-300">
              {isGifWorkflow
                ? "This section only accepts GIF files."
                : "GIF files belong in the GIF section."}
            </p>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-300 border-b border-slate-700 pb-2">
            2. Configure Output
          </h2>

          {isGifWorkflow ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3">
              <p className="text-sm font-medium text-slate-300">Convert To</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                Animated WEBP
              </p>
              <p className="mt-1 text-xs text-slate-400">
                GIF uploads from this section are exported as animated WebP.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Convert To
                </label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="jpg">JPG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WEBP</option>
                </select>
              </div>

              {outputFormat === "jpg" && hasAlpha && !isMultipleMode && !selectedFileIsGif && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Background Color
                  </label>
                  <ChromeColorPicker
                    value={bgColor}
                    onChange={(color) => setBgColor(color)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-6 pt-6 border-t border-slate-700">
          <button
            onClick={convertImage}
            disabled={convertDisabled}
            className="w-full font-bold text-lg py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white active:scale-[0.98]"
          >
            {isConverting ? "Converting..." : "Convert"}
          </button>

          {isConverting && (
            <div className="space-y-2">
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${conversionProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-center text-slate-400 truncate">
                {currentAction}
              </p>
            </div>
          )}

          {conversionLog.length > 0 && !isConverting && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-300">
                Conversion Log
              </h3>
              <div className="max-h-32 overflow-y-auto bg-slate-900/50 p-3 rounded-lg text-xs space-y-1">
                {conversionLog.map((log, index) => (
                  <p
                    key={index}
                    className={
                      log.status === "error" ? "text-red-400" : "text-slate-400"
                    }
                  >
                    {log.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {convertedPath && (
            <div className="p-3 bg-green-500/10 text-sm text-green-300 rounded-md">
              <p>Converted image saved at:</p>
              <span className="break-all text-xs opacity-80">
                {convertedPath}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImageConverter;
