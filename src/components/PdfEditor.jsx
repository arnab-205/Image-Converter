import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

// ── Icons ──
const IconBack = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const IconFile = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);
const IconLayers = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25L12 17.25 2.25 12l4.179-2.25m11.142 0l4.179 2.25L12 22.5l-9.75-5.25 4.179-2.25" />
  </svg>
);
const IconOrganize = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v3.75m0 10.5V21m7.5-18v3.75m0 10.5V21" />
  </svg>
);
const IconExport = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);
const IconInfo = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
);
const IconZoomIn = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
  </svg>
);
const IconZoomOut = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
  </svg>
);
const IconChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);
const IconChevronRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);
const IconPages = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);
const IconTrash = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);
const IconPlus = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
const IconArrowUp = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);
const IconArrowDown = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);
const IconImages = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 6.75h.008v.008H6.75V6.75zm10.5 0h.008v.008h-.008V6.75zM6.75 3h10.5a3.75 3.75 0 013.75 3.75v10.5a3.75 3.75 0 01-3.75 3.75H6.75a3.75 3.75 0 01-3.75-3.75V6.75A3.75 3.75 0 016.75 3z" />
  </svg>
);
const IconDownload = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);
const IconImageAdd = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 6.75h.008v.008H6.75V6.75zM6.75 3h10.5a3.75 3.75 0 013.75 3.75v10.5a3.75 3.75 0 01-3.75 3.75H6.75a3.75 3.75 0 01-3.75-3.75V6.75A3.75 3.75 0 016.75 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v6m3-3h-6" strokeWidth={2.5} />
  </svg>
);

export default function PdfEditor({ onBack }) {
  const [pdfPath, setPdfPath] = useState("");
  const [fileName, setFileName] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [renderedImage, setRenderedImage] = useState(null);
  const [layers, setLayers] = useState([]);
  const [activeLayers, setActiveLayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(50);
  const [activePanel, setActivePanel] = useState("pages"); // pages | layers | export | info
  const [exportFormat, setExportFormat] = useState("png");
  const [exportStatus, setExportStatus] = useState("");
  const [thumbnails, setThumbnails] = useState([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const [extractedImages, setExtractedImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesSaveFormat, setImagesSaveFormat] = useState("png");
  const [transparentBg, setTransparentBg] = useState(true);
  const [pageObjects, setPageObjects] = useState([]);
  const [hoveredObjectIdx, setHoveredObjectIdx] = useState(null);
  const [selectedObjectIndices, setSelectedObjectIndices] = useState(new Set());
  const [showObjectOverlay, setShowObjectOverlay] = useState(true);
  const [objectFilter, setObjectFilter] = useState("all"); // all | image | text | path | exportable
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });

  // Export loading guard (prevents freeze from double-click)
  const [isExporting, setIsExporting] = useState(false);

  // Excluded child indices (for nested layer unselection)
  const [excludedChildren, setExcludedChildren] = useState(new Set());

  // Marquee (lasso) selection state
  const [marqueeActive, setMarqueeActive] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState(null); // {x, y} in display coords
  const [marqueeEnd, setMarqueeEnd] = useState(null);     // {x, y} in display coords

  // Per-page download format for organize view
  const [downloadFormat, setDownloadFormat] = useState("png");
  const [downloadingPageIdx, setDownloadingPageIdx] = useState(null);

  // Pointer-based drag-and-drop for organize grid
  const [dragState, setDragState] = useState({ active: false, fromIdx: null, overIdx: null });
  const dragGhostRef = useRef(null);
  const gridRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragFromIdxRef = useRef(null);

  const isLoaded = !!metadata;

  // ── Open PDF via native file dialog ──
  const handleOpenPdf = useCallback(async () => {
    try {
      const selected = await invoke("select_pdf_file");
      if (!selected) return;
      await loadPdf(selected);
    } catch (err) {
      setError(`Failed to open file dialog: ${err}`);
    }
  }, []);

  const loadPdf = async (filePath) => {
    setIsLoading(true);
    setError("");
    setRenderedImage(null);
    setExportStatus("");

    try {
      const response = await invoke("pdf_load", { filePath });

      if (response.success) {
        setPdfPath(filePath);
        setFileName(filePath.split(/[/\\]/).pop());
        setMetadata(response.metadata);
        setPages(response.pages || []);
        setCurrentPageIndex(0);

        const layersData = await invoke("pdf_get_layers");
        setLayers(layersData);
        setActiveLayers(layersData.map((l) => l.id));

        // Render first page
        if (response.pages?.length > 0) {
          await renderPage(0, layersData.map((l) => l.id), response.pages);
        }

        // Load thumbnails in background
        (async () => {
          try {
            const thumbs = await invoke("pdf_get_thumbnails", { thumbWidth: 150 });
            setThumbnails(thumbs);
          } catch (_) {}
        })();
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(`Failed to load PDF: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = useCallback(
    async (pageIndex, activeLayerIds, pagesOverride) => {
      const pgs = pagesOverride || pages;
      if (!pgs.length || pageIndex >= pgs.length) return;
      const page = pgs[pageIndex];
      if (!page || !page.width) return;

      setIsLoading(true);
      try {
        // Render at higher resolution for text clarity (PNG).
        const renderWidth = Math.min(2400, Math.floor(page.width * 3));
        const aspectRatio = page.height / page.width;
        const renderHeight = Math.floor(renderWidth * aspectRatio);
        const response = await invoke("pdf_render_page", {
          request: {
            page_index: pageIndex,
            width: renderWidth,
            height: renderHeight,
            active_layers: activeLayerIds || activeLayers,
          },
        });

        if (response.success && response.image_data) {
          setRenderedImage(response.image_data);
        } else {
          setError(response.message);
        }
      } catch (err) {
        setError(`Render failed: ${err}`);
      } finally {
        setIsLoading(false);
      }
    },
    [pages, activeLayers],
  );

  // ── Navigation ──
  const goToPreviousPage = useCallback(() => {
    if (currentPageIndex > 0) {
      const idx = currentPageIndex - 1;
      setCurrentPageIndex(idx);
      renderPage(idx, activeLayers);
    }
  }, [currentPageIndex, activeLayers, renderPage]);

  const goToNextPage = useCallback(() => {
    if (currentPageIndex < pages.length - 1) {
      const idx = currentPageIndex + 1;
      setCurrentPageIndex(idx);
      renderPage(idx, activeLayers);
    }
  }, [currentPageIndex, pages.length, activeLayers, renderPage]);

  // ── Layer Toggle ──
  const toggleLayer = useCallback(
    async (layerId) => {
      const next = activeLayers.includes(layerId)
        ? activeLayers.filter((id) => id !== layerId)
        : [...activeLayers, layerId];
      setActiveLayers(next);
      await renderPage(currentPageIndex, next);
    },
    [activeLayers, currentPageIndex, renderPage],
  );

  // ── Export ──
  const handleExportPage = useCallback(async () => {
    if (!pdfPath || isExporting) return;
    setIsExporting(true);
    setExportStatus("");
    setError("");
    try {
      const ts = Date.now();
      const outputPath = `${pdfPath}-page${currentPageIndex + 1}-${ts}.${exportFormat}`;
      const page = pages[currentPageIndex];
      const ok = await invoke("pdf_export_page", {
        request: {
          page_index: currentPageIndex,
          output_path: outputPath,
          width: Math.floor(page.width * 3),
          height: Math.floor(page.height * 3),
          format: exportFormat,
        },
      });
      if (ok) {
        setExportStatus(`Saved to ${outputPath}`);
      }
    } catch (err) {
      setError(`Export failed: ${err}`);
    } finally {
      setIsExporting(false);
    }
  }, [pdfPath, currentPageIndex, pages, exportFormat, isExporting]);

  // ── Close PDF ──
  const handleClosePdf = useCallback(async () => {
    try {
      await invoke("pdf_unload");
    } catch (_) {}
    setPdfPath("");
    setFileName("");
    setMetadata(null);
    setPages([]);
    setRenderedImage(null);
    setLayers([]);
    setActiveLayers([]);
    setError("");
    setExportStatus("");
    setCurrentPageIndex(0);
    setZoom(50);
    setThumbnails([]);
    setExtractedImages([]);
    setPageObjects([]);
    setSelectedObjectIndices(new Set());
    setHoveredObjectIdx(null);
    setIsExporting(false);
    setExcludedChildren(new Set());
  }, []);

  // ── Load thumbnails ──
  const loadThumbnails = useCallback(async () => {
    setThumbsLoading(true);
    try {
      const thumbs = await invoke("pdf_get_thumbnails", { thumbWidth: 150 });
      setThumbnails(thumbs);
    } catch (err) {
      console.error("Thumbnails failed:", err);
    } finally {
      setThumbsLoading(false);
    }
  }, []);

  // ── Page management ──
  const handleDeletePage = useCallback(async (pageIndex) => {
    if (pages.length <= 1) return; // don't delete the last page
    try {
      const newPages = await invoke("pdf_delete_pages", { pageIndices: [pageIndex] });
      setPages(newPages);
      const newIdx = Math.min(currentPageIndex, newPages.length - 1);
      setCurrentPageIndex(newIdx);
      await renderPage(newIdx, activeLayers, newPages);
      loadThumbnails();
    } catch (err) {
      setError(`Delete failed: ${err}`);
    }
  }, [pages, currentPageIndex, activeLayers, renderPage, loadThumbnails]);

  const handleInsertBlankPage = useCallback(async (position) => {
    try {
      const newPages = await invoke("pdf_insert_blank_page", { position });
      setPages(newPages);
      setCurrentPageIndex(position);
      await renderPage(position, activeLayers, newPages);
      loadThumbnails();
    } catch (err) {
      setError(`Insert failed: ${err}`);
    }
  }, [activeLayers, renderPage, loadThumbnails]);

  const handleMovePage = useCallback(async (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= pages.length) return;

    // Build new order by swapping
    const newOrder = pages.map((_, i) => i);
    [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];

    try {
      const newPages = await invoke("pdf_reorder_pages", { newOrder });
      setPages(newPages);
      setCurrentPageIndex(toIndex);
      await renderPage(toIndex, activeLayers, newPages);
      loadThumbnails();
    } catch (err) {
      setError(`Reorder failed: ${err}`);
    }
  }, [pages, activeLayers, renderPage, loadThumbnails]);

  // ── Pointer-based drag reorder ──
  const handleDragReorder = useCallback(async (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= pages.length || toIndex >= pages.length) return;

    const order = pages.map((_, i) => i);
    const [removed] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, removed);

    try {
      const newPages = await invoke("pdf_reorder_pages", { newOrder: order });
      setPages(newPages);
      setCurrentPageIndex(toIndex);
      loadThumbnails();
    } catch (err) {
      setError(`Reorder failed: ${err}`);
    }
  }, [pages, activeLayers, renderPage, loadThumbnails]);

  const getCardIdxFromPoint = useCallback((clientX, clientY) => {
    const els = document.elementsFromPoint(clientX, clientY);
    for (const el of els) {
      const attr = el.getAttribute("data-page-idx");
      if (attr !== null) return parseInt(attr, 10);
      // Check parent (for inner elements)
      const parentAttr = el.parentElement?.getAttribute("data-page-idx");
      if (parentAttr !== null) return parseInt(parentAttr, 10);
    }
    return null;
  }, []);

  const onDragPointerDown = useCallback((e, idx) => {
    // Only start drag from the card area (not buttons)
    if (e.target.closest("button")) return;
    dragFromIdxRef.current = idx;
    isDraggingRef.current = false;

    const onMove = (moveE) => {
      const dx = moveE.clientX - dragStartPos.current.x;
      const dy = moveE.clientY - dragStartPos.current.y;

      // Require 8px movement to start dragging (prevents accidental drags)
      if (!isDraggingRef.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        isDraggingRef.current = true;
        setDragState({ active: true, fromIdx: dragFromIdxRef.current, overIdx: null });

        // Create ghost element
        if (!dragGhostRef.current) {
          const ghost = document.createElement("div");
          ghost.className = "fixed z-[9999] pointer-events-none rounded-xl border-2 border-rose-400 bg-slate-800/90 shadow-2xl shadow-rose-500/30 backdrop-blur-sm flex items-center justify-center";
          ghost.style.width = "100px";
          ghost.style.height = "80px";
          ghost.style.transition = "none";
          ghost.innerHTML = `<span class="text-rose-400 font-bold text-lg">${dragFromIdxRef.current + 1}</span>`;
          document.body.appendChild(ghost);
          dragGhostRef.current = ghost;
        }
      }

      if (isDraggingRef.current && dragGhostRef.current) {
        dragGhostRef.current.style.left = `${moveE.clientX - 50}px`;
        dragGhostRef.current.style.top = `${moveE.clientY - 40}px`;

        // Hide ghost temporarily to hit-test cards beneath
        dragGhostRef.current.style.display = "none";
        const overIdx = getCardIdxFromPoint(moveE.clientX, moveE.clientY);
        dragGhostRef.current.style.display = "";

        if (overIdx !== null && overIdx !== dragFromIdxRef.current) {
          setDragState((prev) => ({ ...prev, overIdx }));
        } else {
          setDragState((prev) => ({ ...prev, overIdx: null }));
        }
      }
    };

    const onUp = (upE) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      if (dragGhostRef.current) {
        document.body.removeChild(dragGhostRef.current);
        dragGhostRef.current = null;
      }

      if (isDraggingRef.current) {
        // Hide ghost to hit-test final drop target
        const overIdx = getCardIdxFromPoint(upE.clientX, upE.clientY);
        if (overIdx !== null && overIdx !== dragFromIdxRef.current) {
          handleDragReorder(dragFromIdxRef.current, overIdx);
        }
      }

      isDraggingRef.current = false;
      dragFromIdxRef.current = null;
      setDragState({ active: false, fromIdx: null, overIdx: null });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [getCardIdxFromPoint, handleDragReorder]);

  // ── Download a specific page as image ──
  const handleDownloadPage = useCallback(async (pageIndex, format) => {
    if (!pdfPath || downloadingPageIdx !== null) return;
    setDownloadingPageIdx(pageIndex);
    setError("");
    try {
      const page = pages[pageIndex];
      const ts = Date.now();
      const outputPath = `${pdfPath}-page${pageIndex + 1}-${ts}.${format}`;
      await invoke("pdf_export_page", {
        request: {
          page_index: pageIndex,
          output_path: outputPath,
          width: Math.floor(page.width * 3),
          height: Math.floor(page.height * 3),
          format,
        },
      });
      setExportStatus(`Saved page ${pageIndex + 1} to ${outputPath}`);
    } catch (err) {
      setError(`Download page ${pageIndex + 1} failed: ${err}`);
    } finally {
      setDownloadingPageIdx(null);
    }
  }, [pdfPath, pages, downloadingPageIdx]);

  // ── Insert image as new page ──
  const handleAddImageAsPage = useCallback(async (position) => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const filePath = await open({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif", "gif"],
          },
        ],
      });
      if (!filePath) return;

      const imagePath = typeof filePath === "string" ? filePath : filePath.path;
      if (!imagePath) return;

      const newPages = await invoke("pdf_insert_image_as_page", {
        request: { image_path: imagePath, position },
      });
      setPages(newPages);
      setCurrentPageIndex(position);
      await renderPage(position, activeLayers, newPages);
      loadThumbnails();
    } catch (err) {
      setError(`Add image as page failed: ${err}`);
    }
  }, [activeLayers, renderPage, loadThumbnails]);

  // ── Zoom ──
  const zoomIn = () => setZoom((z) => Math.min(z + 10, 500));
  const zoomOut = () => setZoom((z) => Math.max(z - 10, 10));
  const zoomFit = () => setZoom(50);

  // Mouse wheel zoom on canvas
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return; // only zoom with Ctrl+scroll
      e.preventDefault();
      setZoom((z) => {
        const delta = e.deltaY > 0 ? -10 : 10;
        return Math.min(500, Math.max(25, z + delta));
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Extract images from current page ──
  const extractImages = useCallback(async (pageIndex) => {
    setImagesLoading(true);
    setExtractedImages([]);
    try {
      const images = await invoke("pdf_extract_page_images", { pageIndex });
      setExtractedImages(images);
    } catch (err) {
      setError(`Image extraction failed: ${err}`);
    } finally {
      setImagesLoading(false);
    }
  }, []);

  // ── Fetch page objects (for bounding box overlay) ──
  const fetchPageObjects = useCallback(async (pageIndex) => {
    try {
      const objs = await invoke("pdf_get_page_objects", { pageIndex });
      setPageObjects(objs);
    } catch (err) {
      console.error("Failed to get page objects:", err);
      setPageObjects([]);
    }
  }, []);

  // Auto-fetch page objects when switching to images panel or changing page
  useEffect(() => {
    if (activePanel === "images" && isLoaded) {
      fetchPageObjects(currentPageIndex);
      setExtractedImages([]);
    } else {
      setPageObjects([]);
      setSelectedObjectIndices(new Set());
      setHoveredObjectIdx(null);
    }
  }, [activePanel, currentPageIndex, isLoaded, fetchPageObjects]);

  // ── Save extracted image to disk ──
  const handleSaveExtractedImage = useCallback(async (objectIndex, imgIndex) => {
    if (!pdfPath) return;
    try {
      const ext = imagesSaveFormat;
      const outputPath = `${pdfPath}-page${currentPageIndex + 1}-image${imgIndex + 1}.${ext}`;
      await invoke("pdf_save_extracted_image", {
        request: {
          page_index: currentPageIndex,
          object_index: objectIndex,
          output_path: outputPath,
          format: ext,
        },
      });
      setExportStatus(`Saved image to ${outputPath}`);
    } catch (err) {
      setError(`Save image failed: ${err}`);
    }
  }, [pdfPath, currentPageIndex, imagesSaveFormat]);

  // ── Save all extracted images ──
  const handleSaveAllImages = useCallback(async () => {
    if (!pdfPath || extractedImages.length === 0) return;
    try {
      for (let i = 0; i < extractedImages.length; i++) {
        const img = extractedImages[i];
        const ext = imagesSaveFormat;
        const outputPath = `${pdfPath}-page${currentPageIndex + 1}-image${i + 1}.${ext}`;
        await invoke("pdf_save_extracted_image", {
          request: {
            page_index: currentPageIndex,
            object_index: img.object_index,
            output_path: outputPath,
            format: ext,
          },
        });
      }
      setExportStatus(`Saved ${extractedImages.length} image(s) from page ${currentPageIndex + 1}`);
    } catch (err) {
      setError(`Save all images failed: ${err}`);
    }
  }, [pdfPath, currentPageIndex, extractedImages, imagesSaveFormat]);

  // ── Toggle object selection (multi-select) ──
  const toggleObjectSelection = useCallback((idx) => {
    setSelectedObjectIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // ── Marquee selection complete: select all exportable objects in the drawn rectangle ──
  const EXPORTABLE_TYPES = new Set(["image", "path", "shading"]);
  const handleMarqueeComplete = useCallback((rectDisplay) => {
    if (!imgRef.current || !pages[currentPageIndex]) return;
    const displayW = imgRef.current.clientWidth;
    const displayH = imgRef.current.clientHeight;
    const pw = pages[currentPageIndex].width;
    const ph = pages[currentPageIndex].height;
    if (!displayW || !displayH || !pw || !ph) return;

    const scaleX = displayW / pw;
    const scaleY = displayH / ph;
    const pageArea = pw * ph;

    // Convert marquee display rect → PDF coords
    const pdfLeft   = rectDisplay.x / scaleX;
    const pdfRight  = (rectDisplay.x + rectDisplay.w) / scaleX;
    const pdfTop    = ph - (rectDisplay.y / scaleY);
    const pdfBottom = ph - ((rectDisplay.y + rectDisplay.h) / scaleY);

    const selected = new Set();
    for (const obj of pageObjects) {
      if (!obj.bounds || !EXPORTABLE_TYPES.has(obj.object_type)) continue;
      const [l, b, r, t] = obj.bounds;
      // Filter out full-page backgrounds
      const areaRatio = ((r - l) * (t - b)) / pageArea;
      if (obj.object_type === "image" && areaRatio > 0.85) continue;
      if (obj.object_type === "path" && areaRatio > 0.7) continue;
      // Check overlap (intersection, not containment)
      if (l < pdfRight && r > pdfLeft && b < pdfTop && t > pdfBottom) {
        selected.add(obj.index);
      }
    }
    if (selected.size > 0) {
      setSelectedObjectIndices(selected);
    }
  }, [pageObjects, pages, currentPageIndex]);

  // ── Compute union bounding box of selected objects (excludes text) ──
  const getSelectedBounds = useCallback(() => {
    const selected = pageObjects.filter(
      (o) => selectedObjectIndices.has(o.index) && o.bounds && o.object_type !== "text"
    );
    if (selected.length === 0) return null;
    let [minL, minB, maxR, maxT] = selected[0].bounds;
    for (const obj of selected.slice(1)) {
      const [l, b, r, t] = obj.bounds;
      minL = Math.min(minL, l);
      minB = Math.min(minB, b);
      maxR = Math.max(maxR, r);
      maxT = Math.max(maxT, t);
    }
    return [minL, minB, maxR, maxT];
  }, [pageObjects, selectedObjectIndices]);

  // ── Export selected region as single image (freeze-proof) ──
  const handleExportSelected = useCallback(async () => {
    if (isExporting) return; // guard: prevent double invocation
    const bounds = getSelectedBounds();
    if (!bounds || !pdfPath) return;
    setIsExporting(true);
    setExportStatus("");
    setError("");
    const ext = imagesSaveFormat;
    const ts = Date.now();
    const outputPath = `${pdfPath}-page${currentPageIndex + 1}-selected-${ts}.${ext}`;
    try {
      await invoke("pdf_export_selected_region", {
        request: {
          page_index: currentPageIndex,
          bounds,
          output_path: outputPath,
          format: ext,
          hide_text: true,
          transparent_bg: transparentBg,
          selected_object_indices: Array.from(selectedObjectIndices),
        },
      });
      setExportStatus(`Saved selected region to ${outputPath}`);
    } catch (err) {
      setError(`Export selected failed: ${err}`);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, getSelectedBounds, pdfPath, currentPageIndex, imagesSaveFormat, transparentBg, selectedObjectIndices]);

  // ── Toggle excluded child (for nested layer unselection) ──
  const toggleExcludedChild = useCallback((childIndex) => {
    setExcludedChildren((prev) => {
      const next = new Set(prev);
      if (next.has(childIndex)) next.delete(childIndex);
      else next.add(childIndex);
      return next;
    });
  }, []);

  // ── Sidebar Panels ──
  const sidebarPanels = [
    { id: "pages", icon: <IconPages />, label: "Pages" },
    { id: "organize", icon: <IconOrganize />, label: "Organize Pages" },
    { id: "images", icon: <IconImages />, label: "Extract Images" },
    { id: "export", icon: <IconExport />, label: "Export" },
    { id: "info", icon: <IconInfo />, label: "Info" },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-300 font-sans overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-4 h-12 bg-slate-900 border-b border-slate-800 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Back to Home"
        >
          <IconBack />
        </button>

        <div className="w-px h-5 bg-slate-700" />

        <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="text-sm font-semibold text-slate-200 truncate">
          {fileName || "PDF Editor"}
        </span>

        {isLoaded && (
          <span className="text-xs text-slate-500 ml-1">
            — {pages.length} page{pages.length !== 1 ? "s" : ""}
          </span>
        )}

        <div className="flex-1" />

        {/* File actions */}
        <button
          onClick={handleOpenPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 transition-colors"
        >
          <IconFile />
          Open PDF
        </button>
        {isLoaded && (
          <button
            onClick={handleClosePdf}
            className="flex items-center px-3 py-1.5 text-xs font-medium rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* ── Main Area ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Canvas Area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Page Canvas */}
          <div ref={canvasRef} className="flex-1 relative overflow-auto bg-slate-950">
            {/* Checkered / dark background pattern */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(100,116,139,0.08) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />

            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px]">
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl">
                  <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-slate-300">Rendering...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400 max-w-md text-center">
                {error}
              </div>
            )}

            {/* Empty state — before PDF is loaded */}
            {!isLoaded && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-5">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800">
                    <svg className="w-10 h-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium">No document open</p>
                    <p className="text-slate-600 text-xs mt-1">
                      Open a PDF file to start editing
                    </p>
                  </div>
                  <button
                    onClick={handleOpenPdf}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/20 transition-all active:scale-[0.97]"
                  >
                    <IconFile />
                    Open PDF File
                  </button>
                </div>
              </div>
            )}

            {/* Organize Pages grid view — replaces rendered page when in organize mode */}
            {isLoaded && activePanel === "organize" && (
              <div className="absolute inset-0 overflow-auto p-6 z-[5]">
                <div className="max-w-5xl mx-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-semibold text-slate-300">
                      Organize Pages ({pages.length})
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddImageAsPage(pages.length)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/15 transition-all active:scale-[0.97]"
                      >
                        <IconImageAdd /> Add Image as Page
                      </button>
                      <button
                        onClick={() => handleInsertBlankPage(pages.length)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 transition-colors"
                      >
                        <IconPlus /> Add Blank Page
                      </button>
                    </div>
                  </div>

                  {/* Page grid */}
                  <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {pages.map((page, idx) => (
                      <div
                        key={idx}
                        data-page-idx={idx}
                        onPointerDown={(e) => onDragPointerDown(e, idx)}
                        className={`group relative rounded-xl border transition-all select-none ${
                          dragState.active && dragState.fromIdx === idx
                            ? "opacity-40 scale-95 border-slate-600 bg-slate-900/40"
                            : dragState.active && dragState.overIdx === idx
                            ? "border-rose-400 bg-rose-500/10 ring-2 ring-rose-400/30 scale-[1.02]"
                            : currentPageIndex === idx
                            ? "border-rose-500/50 bg-slate-800/80 ring-2 ring-rose-500/20 shadow-lg shadow-rose-500/10"
                            : "border-slate-700/50 bg-slate-900/60 hover:bg-slate-800/60 hover:border-slate-600"
                        } ${dragState.active ? "cursor-grabbing" : "cursor-grab"}`}
                      >
                        {/* Drop indicator label */}
                        {dragState.active && dragState.overIdx === idx && dragState.fromIdx !== null && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 px-2 py-0.5 rounded bg-rose-500 text-[9px] font-bold text-white shadow-lg whitespace-nowrap">
                            Move page {dragState.fromIdx + 1} here
                          </div>
                        )}
                        {/* Page number badge */}
                        <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-slate-900/80 text-[10px] font-semibold text-slate-400 backdrop-blur-sm">
                          {idx + 1}
                        </div>

                        {/* Downloading spinner overlay */}
                        {downloadingPageIdx === idx && (
                          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/60 rounded-xl backdrop-blur-[1px]">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
                              <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              <span className="text-[10px] text-emerald-400 font-medium">Saving...</span>
                            </div>
                          </div>
                        )}

                        {/* Thumbnail */}
                        <div
                          className="p-3 pt-7 cursor-pointer"
                          onClick={() => {
                            if (dragState.active) return;
                            setCurrentPageIndex(idx);
                            setActivePanel("pages");
                            renderPage(idx, activeLayers);
                          }}
                        >
                          <div className="relative bg-white/5 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: 140 }}>
                            {thumbnails[idx]?.data ? (
                              <img
                                src={thumbnails[idx].data}
                                alt={`Page ${idx + 1}`}
                                className="max-w-full max-h-44 object-contain"
                                draggable={false}
                              />
                            ) : (
                              <div className="text-slate-600 text-xs py-10">
                                {thumbsLoading ? "..." : "No preview"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Page info */}
                        <div className="px-3 pb-1.5 text-center">
                          <span className="text-[10px] text-slate-500">
                            {Math.round(page.width)} × {Math.round(page.height)} pt
                          </span>
                        </div>

                        {/* Download as image */}
                        <div className="flex items-center justify-center gap-1 px-2 pb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
                            {["png", "jpg", "webp"].map((fmt) => (
                              <button
                                key={fmt}
                                onClick={(e) => { e.stopPropagation(); setDownloadFormat(fmt); }}
                                className={`px-1.5 py-0.5 text-[9px] font-bold uppercase transition-colors ${
                                  downloadFormat === fmt
                                    ? "bg-rose-500/20 text-rose-400"
                                    : "text-slate-500 hover:text-slate-300"
                                }`}
                              >
                                {fmt}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadPage(idx, downloadFormat); }}
                            disabled={downloadingPageIdx !== null}
                            title={`Download as ${downloadFormat.toUpperCase()}`}
                            className="p-1 rounded-md hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 disabled:opacity-40 transition-colors"
                          >
                            <IconDownload />
                          </button>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-center gap-1 px-2 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMovePage(idx, -1); }}
                            disabled={idx === 0}
                            title="Move left"
                            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          >
                            <IconArrowUp />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMovePage(idx, 1); }}
                            disabled={idx === pages.length - 1}
                            title="Move right"
                            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          >
                            <IconArrowDown />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddImageAsPage(idx + 1); }}
                            title="Insert image after this page"
                            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-emerald-400 transition-colors"
                          >
                            <IconImageAdd />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleInsertBlankPage(idx + 1); }}
                            title="Insert blank page after"
                            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            <IconPlus />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePage(idx); }}
                            disabled={pages.length <= 1}
                            title="Delete page"
                            className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Export status toast */}
                  {exportStatus && (
                    <div className="mt-4 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 break-all">
                      {exportStatus}
                    </div>
                  )}
                </div>
              </div>
            )}
            {renderedImage && activePanel !== "organize" && (
              <div
                className="inline-flex items-start justify-center p-8"
                style={{ minHeight: "100%", minWidth: "100%" }}
              >
                <div
                  className="shadow-2xl shadow-black/40 rounded-sm relative shrink-0"
                  style={{
                    width: imgNaturalSize.w ? `${Math.round(imgNaturalSize.w * zoom / 100)}px` : "auto",
                  }}
                >
                  <img
                    ref={imgRef}
                    src={renderedImage}
                    alt={`Page ${currentPageIndex + 1}`}
                    className="block w-full h-auto"
                    draggable={false}
                    onLoad={(e) => {
                      setImgNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
                    }}
                  />
                  {/* Selectable text layer */}
                  {activePanel === "images" && showObjectOverlay && pageObjects.length > 0 && pages[currentPageIndex] && imgRef.current && (
                    <TextLayer
                      textBlocks={pageObjects.filter(o => o.object_type === "text")}
                      pdfWidth={pages[currentPageIndex].width}
                      pdfHeight={pages[currentPageIndex].height}
                      imgEl={imgRef.current}
                    />
                  )}
                  {/* Bounding box overlay for non-text objects */}
                  {activePanel === "images" && showObjectOverlay && pageObjects.length > 0 && pages[currentPageIndex] && imgRef.current && (
                    <ObjectOverlay
                      pageObjects={pageObjects}
                      pdfWidth={pages[currentPageIndex].width}
                      pdfHeight={pages[currentPageIndex].height}
                      imgEl={imgRef.current}
                      imgNaturalSize={imgNaturalSize}
                      hoveredIdx={hoveredObjectIdx}
                      selectedIndices={selectedObjectIndices}
                      onHover={setHoveredObjectIdx}
                      onSelect={toggleObjectSelection}
                      filter={objectFilter}
                      marqueeActive={marqueeActive}
                      marqueeStart={marqueeStart}
                      marqueeEnd={marqueeEnd}
                      onMarqueeStart={(pos) => {
                        setMarqueeActive(true);
                        setMarqueeStart(pos);
                        setMarqueeEnd(pos);
                      }}
                      onMarqueeMove={(pos) => {
                        setMarqueeEnd(pos);
                      }}
                      onMarqueeEnd={() => {
                        if (marqueeStart && marqueeEnd) {
                          const mx = Math.min(marqueeStart.x, marqueeEnd.x);
                          const my = Math.min(marqueeStart.y, marqueeEnd.y);
                          const mw = Math.abs(marqueeEnd.x - marqueeStart.x);
                          const mh = Math.abs(marqueeEnd.y - marqueeStart.y);
                          if (mw > 5 && mh > 5) {
                            handleMarqueeComplete({ x: mx, y: my, w: mw, h: mh });
                            setObjectFilter("exportable");
                          }
                        }
                        setMarqueeActive(false);
                        setMarqueeStart(null);
                        setMarqueeEnd(null);
                      }}
                    />
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ── Bottom Toolbar (zoom + page nav) ── */}
          {isLoaded && (
            <div className="flex items-center justify-between px-4 h-10 bg-slate-900 border-t border-slate-800 shrink-0">
              {/* Page navigation */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPageIndex === 0}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <IconChevronLeft />
                </button>
                <span className="text-xs text-slate-400 tabular-nums min-w-[60px] text-center">
                  {currentPageIndex + 1} / {pages.length}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPageIndex >= pages.length - 1}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <IconChevronRight />
                </button>
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1.5">
                <button onClick={zoomOut} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                  <IconZoomOut />
                </button>
                <button
                  onClick={zoomFit}
                  className="text-xs text-slate-400 hover:text-slate-200 tabular-nums min-w-[40px] text-center px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
                >
                  {zoom}%
                </button>
                <button onClick={zoomIn} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                  <IconZoomIn />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        {isLoaded && (
          <div className="flex shrink-0">
            {/* Tab buttons */}
            <div className="flex flex-col items-center w-11 bg-slate-900 border-l border-slate-800 pt-2 gap-1">
              {sidebarPanels.map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => setActivePanel(panel.id)}
                  title={panel.label}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                    activePanel === panel.id
                      ? "bg-slate-800 text-rose-400"
                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  {panel.icon}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div className="w-64 bg-slate-900/70 border-l border-slate-800 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* ── Pages Panel ── */}
                {activePanel === "pages" && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Pages ({pages.length})
                      </h3>
                      <button
                        onClick={() => handleInsertBlankPage(pages.length)}
                        title="Add blank page at end"
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <IconPlus /> Add
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
                      {pages.map((page, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setCurrentPageIndex(idx);
                            renderPage(idx, activeLayers);
                          }}
                          className={`group relative rounded-lg border cursor-pointer transition-all ${
                            currentPageIndex === idx
                              ? "border-rose-500/50 bg-slate-800 ring-1 ring-rose-500/20"
                              : "border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600"
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="p-2">
                            <div className="relative bg-white/5 rounded overflow-hidden flex items-center justify-center" style={{ minHeight: 80 }}>
                              {thumbnails[idx]?.data ? (
                                <img
                                  src={thumbnails[idx].data}
                                  alt={`Page ${idx + 1}`}
                                  className="max-w-full max-h-28 object-contain"
                                  draggable={false}
                                />
                              ) : (
                                <div className="text-slate-600 text-xs py-6">
                                  {thumbsLoading ? "..." : "No preview"}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Page label & controls */}
                          <div className="flex items-center justify-between px-2 pb-2">
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              Page {idx + 1}
                            </span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMovePage(idx, -1); }}
                                disabled={idx === 0}
                                title="Move up"
                                className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              >
                                <IconArrowUp />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMovePage(idx, 1); }}
                                disabled={idx === pages.length - 1}
                                title="Move down"
                                className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              >
                                <IconArrowDown />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleInsertBlankPage(idx + 1); }}
                                title="Insert blank page after"
                                className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                <IconPlus />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeletePage(idx); }}
                                disabled={pages.length <= 1}
                                title="Delete page"
                                className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Organize Pages Panel ── */}
                {activePanel === "organize" && (
                  <>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Organize Pages
                    </h3>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Rearrange, add, or remove pages. Click a thumbnail in the grid to view it.
                    </p>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleAddImageAsPage(pages.length)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white transition-all active:scale-[0.97] shadow-lg shadow-rose-500/15"
                      >
                        <IconImageAdd /> Add Image as Page
                      </button>
                      <button
                        onClick={() => handleInsertBlankPage(pages.length)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all active:scale-[0.97]"
                      >
                        <IconPlus /> Add Blank Page
                      </button>
                    </div>

                    <div className="border-t border-slate-800 pt-3" />

                    {/* Compact page list in sidebar */}
                    <div className="space-y-1.5 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
                      {pages.map((page, idx) => (
                        <div
                          key={idx}
                          className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                            currentPageIndex === idx
                              ? "bg-slate-800 border border-rose-500/40 ring-1 ring-rose-500/20"
                              : "bg-slate-800/30 border border-transparent hover:bg-slate-800/60 hover:border-slate-700"
                          }`}
                          onClick={() => {
                            setCurrentPageIndex(idx);
                            setActivePanel("pages");
                            renderPage(idx, activeLayers);
                          }}
                        >
                          {/* Mini thumbnail */}
                          <div className="w-8 h-10 bg-white/5 rounded overflow-hidden flex items-center justify-center shrink-0">
                            {thumbnails[idx]?.data ? (
                              <img src={thumbnails[idx].data} alt="" className="max-w-full max-h-full object-contain" draggable={false} />
                            ) : (
                              <span className="text-[8px] text-slate-600">{idx + 1}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] text-slate-400">Page {idx + 1}</span>
                            <div className="text-[9px] text-slate-600">{Math.round(page.width)}×{Math.round(page.height)}</div>
                          </div>
                          {/* Quick actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMovePage(idx, -1); }}
                              disabled={idx === 0}
                              title="Move up"
                              className="p-0.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-20 transition-colors"
                            >
                              <IconArrowUp />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMovePage(idx, 1); }}
                              disabled={idx === pages.length - 1}
                              title="Move down"
                              className="p-0.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 disabled:opacity-20 transition-colors"
                            >
                              <IconArrowDown />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePage(idx); }}
                              disabled={pages.length <= 1}
                              title="Delete"
                              className="p-0.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 disabled:opacity-20 transition-colors"
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Extract Images Panel ── */}
                {activePanel === "images" && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Objects — Page {currentPageIndex + 1}
                      </h3>
                      <button
                        onClick={() => fetchPageObjects(currentPageIndex)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        Refresh
                      </button>
                    </div>

                    {/* Overlay toggle + filter */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showObjectOverlay}
                          onChange={(e) => setShowObjectOverlay(e.target.checked)}
                          className="rounded border-slate-600 bg-slate-800 text-rose-500 focus:ring-rose-500/30 w-3.5 h-3.5"
                        />
                        <span className="text-[11px] text-slate-400">Show bounding boxes on page</span>
                      </label>

                      <div className="flex gap-1 flex-wrap">
                        {[
                          { key: "all", label: "All" },
                          { key: "image", label: "Images", color: "text-emerald-400" },
                          { key: "text", label: "Text", color: "text-sky-400" },
                          { key: "path", label: "Shapes", color: "text-amber-400" },
                          { key: "exportable", label: "Draw", color: "text-rose-400" },
                        ].map((f) => (
                          <button
                            key={f.key}
                            onClick={() => setObjectFilter(f.key)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              objectFilter === f.key
                                ? "bg-slate-700 text-slate-200 ring-1 ring-slate-600"
                                : "bg-slate-800/60 text-slate-500 hover:text-slate-300"
                            } ${f.color || ""}`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {/* Object summary */}
                      {pageObjects.length > 0 && (
                        <div className="text-[10px] text-slate-500 flex gap-2 flex-wrap">
                          <span className="text-emerald-400/70">
                            {pageObjects.filter((o) => o.object_type === "image").length} images
                          </span>
                          <span className="text-sky-400/70">
                            {pageObjects.filter((o) => o.object_type === "text").length} text
                          </span>
                          <span className="text-amber-400/70">
                            {pageObjects.filter((o) => o.object_type === "path").length} shapes
                          </span>
                        </div>
                      )}

                      {/* Marquee draw hint for exportable mode */}
                      {objectFilter === "exportable" && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-rose-500/10 border border-rose-500/20">
                          <svg className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                          </svg>
                          <span className="text-[10px] text-rose-300/80">Draw a rectangle on the page to auto-select images, shapes & shadings in that area</span>
                        </div>
                      )}
                    </div>

                    {/* Object list — click to multi-select */}
                    {pageObjects.length > 0 && (
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {pageObjects
                          .filter((o) => {
                            if (objectFilter === "exportable") {
                              if (!["image", "path", "shading"].includes(o.object_type)) return false;
                            } else if (objectFilter !== "all" && o.object_type !== objectFilter) return false;
                            // Hide full-page background images/paths from list
                            if (o.bounds && pages[currentPageIndex]) {
                              const [l, b, r, t] = o.bounds;
                              const objArea = (r - l) * (t - b);
                              const pageArea = pages[currentPageIndex].width * pages[currentPageIndex].height;
                              if (o.object_type === "image" && objArea / pageArea > 0.85) return false;
                              if (o.object_type === "path" && objArea / pageArea > 0.7) return false;
                            }
                            return true;
                          })
                          .map((obj) => {
                            const isSelected = selectedObjectIndices.has(obj.index);
                            return (
                              <div
                                key={obj.index}
                                onMouseEnter={() => setHoveredObjectIdx(obj.index)}
                                onMouseLeave={() => setHoveredObjectIdx(null)}
                                className={`rounded text-[10px] transition-colors ${
                                  isSelected
                                    ? "bg-slate-700 ring-1 ring-rose-500/40"
                                    : hoveredObjectIdx === obj.index
                                    ? "bg-slate-800"
                                    : "bg-slate-800/30 hover:bg-slate-800/60"
                                }`}
                              >
                                <div
                                  className="flex items-center gap-2 px-2 py-1 cursor-pointer"
                                  onClick={() => toggleObjectSelection(obj.index)}
                                >
                                  {/* Selection checkbox */}
                                  <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? "bg-rose-500 border-rose-500"
                                      : "border-slate-600 bg-slate-800"
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    )}
                                  </span>
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                                    obj.object_type === "image" ? "bg-emerald-400" :
                                    obj.object_type === "text" ? "bg-sky-400" :
                                    obj.object_type === "path" ? "bg-amber-400" :
                                    "bg-slate-500"
                                  }`} />
                                  <span className="text-slate-400 truncate flex-1">
                                    {obj.object_type === "image"
                                      ? `Image ${obj.image_width}×${obj.image_height}px`
                                      : obj.object_type === "text" && obj.text_content
                                      ? obj.text_content.slice(0, 40) + (obj.text_content.length > 40 ? "…" : "")
                                      : `${obj.object_type} #${obj.index >= 100000 ? obj.index - 100000 + 1 : obj.index}`}
                                  </span>
                                </div>
                                {/* Show text content when selected */}
                                {isSelected && obj.object_type === "text" && obj.text_content && (
                                  <div className="px-2 pb-1.5 pt-0.5">
                                    <div className="px-2 py-1 rounded bg-slate-800 text-[10px] text-sky-300/80 select-all cursor-text break-words leading-relaxed">
                                      {obj.text_content}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {/* Selection info + actions */}
                    {selectedObjectIndices.size > 0 && (
                      <div className="space-y-2 border-t border-slate-800 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            {selectedObjectIndices.size} object{selectedObjectIndices.size !== 1 ? "s" : ""} selected
                          </span>
                          <button
                            onClick={() => { setSelectedObjectIndices(new Set()); setExcludedChildren(new Set()); }}
                            className="text-[10px] text-slate-500 hover:text-slate-300 underline transition-colors"
                          >
                            Clear
                          </button>
                        </div>

                        {/* Nested layer tree for selected group objects */}
                        {(() => {
                          const selectedWithChildren = pageObjects.filter(
                            (o) => selectedObjectIndices.has(o.index) && o.children && o.children.length > 0
                          );
                          if (selectedWithChildren.length === 0) return null;
                          return (
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-slate-500 font-medium">Inner Layers</span>
                              {selectedWithChildren.map((parent) => (
                                <div key={parent.index} className="pl-1 border-l border-slate-700 space-y-0.5">
                                  <div className="text-[10px] text-slate-400 font-medium pl-1">
                                    {parent.object_type} #{parent.index} — {parent.children.length} children
                                  </div>
                                  {parent.children.map((childIdx) => {
                                    const child = pageObjects.find((o) => o.index === childIdx);
                                    if (!child) return null;
                                    const isExcluded = excludedChildren.has(childIdx);
                                    return (
                                      <div
                                        key={childIdx}
                                        onClick={() => toggleExcludedChild(childIdx)}
                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer text-[10px] transition-colors ${
                                          isExcluded
                                            ? "bg-slate-800/30 text-slate-600 line-through"
                                            : "bg-slate-800/60 text-slate-400 hover:bg-slate-700"
                                        }`}
                                      >
                                        <span className={`w-2.5 h-2.5 rounded border flex items-center justify-center shrink-0 ${
                                          isExcluded ? "border-slate-700 bg-slate-800" : "bg-emerald-500 border-emerald-500"
                                        }`}>
                                          {!isExcluded && (
                                            <svg className="w-1.5 h-1.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                          )}
                                        </span>
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                          child.object_type === "image" ? "bg-emerald-400" :
                                          child.object_type === "text" ? "bg-sky-400" :
                                          child.object_type === "path" ? "bg-amber-400" : "bg-slate-500"
                                        }`} />
                                        <span className="truncate">
                                          {child.object_type === "image"
                                            ? `Image ${child.image_width}×${child.image_height}`
                                            : child.object_type === "text" && child.text_content
                                            ? child.text_content.slice(0, 25) + (child.text_content.length > 25 ? "…" : "")
                                            : `${child.object_type} #${child.index}`}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Save format selector */}
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Export format</label>
                          <div className="grid grid-cols-3 gap-1">
                            {["png", "jpg", "webp"].map((fmt) => (
                              <button
                                key={fmt}
                                onClick={() => setImagesSaveFormat(fmt)}
                                className={`py-1 rounded text-[10px] font-semibold uppercase transition-colors ${
                                  imagesSaveFormat === fmt
                                    ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                }`}
                              >
                                {fmt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Background mode selector */}
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Background</label>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() => setTransparentBg(true)}
                              className={`py-1.5 rounded text-[10px] font-semibold transition-colors ${
                                transparentBg
                                  ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
                                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              Transparent
                            </button>
                            <button
                              type="button"
                              onClick={() => setTransparentBg(false)}
                              className={`py-1.5 rounded text-[10px] font-semibold transition-colors ${
                                !transparentBg
                                  ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
                                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              As-is
                            </button>
                          </div>
                          {transparentBg && imagesSaveFormat === "jpg" && (
                            <p className="text-[9px] text-amber-400/70 mt-1">JPEG doesn't support transparency — will export with white background</p>
                          )}
                        </div>

                        {/* Export selected region */}
                        {(() => {
                          const hasExportable = pageObjects.some(
                            (o) => selectedObjectIndices.has(o.index) && o.bounds && o.object_type !== "text"
                          );
                          return hasExportable ? (
                            <button
                              onClick={handleExportSelected}
                              disabled={isExporting}
                              className="w-full py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white transition-all active:scale-[0.97] shadow-lg shadow-rose-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isExporting ? "Exporting..." : `Export Selected as ${imagesSaveFormat.toUpperCase()}`}
                            </button>
                          ) : (
                            <p className="text-[10px] text-slate-600 italic">Select images or shapes to export</p>
                          );
                        })()}
                      </div>
                    )}

                    <div className="border-t border-slate-800 pt-3" />

                    {/* Extract embedded images section */}
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Extract Embedded Images
                    </h3>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Extract actual embedded image files from the PDF.
                    </p>
                    <button
                      onClick={() => extractImages(currentPageIndex)}
                      disabled={imagesLoading}
                      className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all active:scale-[0.97] disabled:opacity-50"
                    >
                      {imagesLoading ? "Extracting..." : "Extract Images from Page"}
                    </button>

                    {extractedImages.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] text-slate-500">
                          {extractedImages.length} image{extractedImages.length !== 1 ? "s" : ""} found
                        </p>

                        {/* Save all button */}
                        <button
                          onClick={handleSaveAllImages}
                          className="w-full py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all active:scale-[0.97]"
                        >
                          Save All ({extractedImages.length}) as {imagesSaveFormat.toUpperCase()}
                        </button>

                        {/* Individual images */}
                        <div className="space-y-2 max-h-[calc(100vh-28rem)] overflow-y-auto pr-1">
                          {extractedImages.map((img, idx) => (
                            <div
                              key={idx}
                              className="group relative rounded-lg border border-slate-700/50 bg-slate-800/30 overflow-hidden"
                              onMouseEnter={() => setHoveredObjectIdx(img.object_index)}
                              onMouseLeave={() => setHoveredObjectIdx(null)}
                            >
                              <div className="p-2 bg-white/5 flex items-center justify-center">
                                <img
                                  src={img.data}
                                  alt={`Extracted image ${idx + 1}`}
                                  className="max-w-full max-h-36 object-contain"
                                  draggable={false}
                                />
                              </div>
                              <div className="flex items-center justify-between px-2 py-1.5">
                                <span className="text-[10px] text-slate-500">
                                  Image {idx + 1} — {img.width}×{img.height}px
                                </span>
                                <button
                                  onClick={() => handleSaveExtractedImage(img.object_index, idx)}
                                  title={`Save as ${imagesSaveFormat.toUpperCase()}`}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                                >
                                  <IconDownload /> Save
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {exportStatus && (
                      <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 break-all">
                        {exportStatus}
                      </div>
                    )}
                  </>
                )}

                {/* ── Export Panel ── */}
                {activePanel === "export" && (
                  <>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Export Page as Image
                    </h3>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Convert the entire page {currentPageIndex + 1} to an image file.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1.5">Format</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {["png", "jpg", "webp"].map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => setExportFormat(fmt)}
                              className={`py-1.5 rounded-md text-xs font-semibold uppercase transition-colors ${
                                exportFormat === fmt
                                  ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
                                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              {fmt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleExportPage}
                        disabled={isExporting}
                        className="w-full py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white transition-all active:scale-[0.97] shadow-lg shadow-rose-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isExporting ? "Exporting..." : `Export Page ${currentPageIndex + 1} as ${exportFormat.toUpperCase()}`}
                      </button>

                      {exportStatus && (
                        <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 break-all">
                          {exportStatus}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── Info Panel ── */}
                {activePanel === "info" && (
                  <>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Document Info
                    </h3>

                    <div className="space-y-3">
                      <InfoRow label="File" value={fileName} />
                      <InfoRow
                        label="Pages"
                        value={metadata?.page_count ?? pages.length}
                      />
                      {pages[currentPageIndex] && (
                        <>
                          <InfoRow
                            label="Current Page"
                            value={`${currentPageIndex + 1}`}
                          />
                          <InfoRow
                            label="Dimensions"
                            value={`${Math.round(pages[currentPageIndex].width)} × ${Math.round(pages[currentPageIndex].height)} pt`}
                          />
                        </>
                      )}
                      <InfoRow
                        label="Path"
                        value={pdfPath}
                        mono
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div>
      <dt className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</dt>
      <dd
        className={`mt-0.5 text-xs text-slate-300 break-all ${mono ? "font-mono text-[11px]" : ""}`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

// Color map for object types
const OBJECT_COLORS = {
  image: { border: "rgba(52, 211, 153, 0.9)", bg: "rgba(52, 211, 153, 0.06)", hoverBg: "rgba(52, 211, 153, 0.22)", label: "#34d399" },
  text:  { border: "rgba(56, 189, 248, 0.6)", bg: "rgba(56, 189, 248, 0.04)", hoverBg: "rgba(56, 189, 248, 0.14)", label: "#38bdf8" },
  path:  { border: "rgba(251, 191, 36, 0.4)", bg: "rgba(251, 191, 36, 0.02)", hoverBg: "rgba(251, 191, 36, 0.08)", label: "#fbbf24" },
  shading: { border: "rgba(168, 85, 247, 0.4)", bg: "rgba(168, 85, 247, 0.02)", hoverBg: "rgba(168, 85, 247, 0.08)", label: "#a855f7" },
  form:  { border: "rgba(244, 114, 182, 0.4)", bg: "rgba(244, 114, 182, 0.02)", hoverBg: "rgba(244, 114, 182, 0.08)", label: "#f472b6" },
};

/**
 * TextLayer — renders invisible but browser-selectable text positioned over the page.
 * Works like PDF.js: text is transparent but can be highlighted/copied by the user.
 */
function TextLayer({ textBlocks, pdfWidth, pdfHeight, imgEl }) {
  const displayW = imgEl.clientWidth;
  const displayH = imgEl.clientHeight;
  if (!displayW || !displayH || !pdfWidth || !pdfHeight) return null;

  const scaleX = displayW / pdfWidth;
  const scaleY = displayH / pdfHeight;

  return (
    <div
      className="absolute inset-0"
      style={{ width: displayW, height: displayH, zIndex: 2, pointerEvents: "none" }}
    >
      {textBlocks.map((obj) => {
        if (!obj.bounds || !obj.text_content) return null;
        const [left, bottom, right, top] = obj.bounds;
        const x = left * scaleX;
        const y = (pdfHeight - top) * scaleY;
        const w = (right - left) * scaleX;
        const h = (top - bottom) * scaleY;
        if (w < 2 || h < 2) return null;

        const fontSize = Math.max(1, h * 0.82);

        return (
          <div
            key={obj.index}
            className="absolute overflow-hidden"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${w}px`,
              height: `${h}px`,
              fontSize: `${fontSize}px`,
              lineHeight: `${h}px`,
              fontFamily: "sans-serif",
              color: "transparent",
              pointerEvents: "auto",
              cursor: "text",
              userSelect: "text",
              WebkitUserSelect: "text",
              whiteSpace: "nowrap",
            }}
          >
            {obj.text_content}
          </div>
        );
      })}
    </div>
  );
}

/**
 * ObjectOverlay — uses hit-testing so ANY overlapping object can be selected.
 * All bounding-box divs are pointer-events:none (visual only).
 * A transparent click layer on top handles clicks: finds all objects whose
 * bounding box contains the click point, picks the smallest one that isn't
 * already selected, and toggles it. This means paths inside images,
 * paths inside paths, shading — everything is selectable.
 */
function ObjectOverlay({
  pageObjects,
  pdfWidth,
  pdfHeight,
  imgEl,
  imgNaturalSize,
  hoveredIdx,
  selectedIndices,
  onHover,
  onSelect,
  filter,
  marqueeActive,
  marqueeStart,
  marqueeEnd,
  onMarqueeStart,
  onMarqueeMove,
  onMarqueeEnd,
}) {
  const displayW = imgEl.clientWidth;
  const displayH = imgEl.clientHeight;
  if (!displayW || !displayH || !pdfWidth || !pdfHeight) return null;

  const scaleX = displayW / pdfWidth;
  const scaleY = displayH / pdfHeight;
  const pageArea = pdfWidth * pdfHeight;

  // Apply user filter — include text objects now
  const filtered = pageObjects.filter((obj) => {
    if (!obj.bounds) return false;
    if (filter === "exportable") {
      if (!["image", "path", "shading"].includes(obj.object_type)) return false;
    } else if (filter !== "all" && obj.object_type !== filter) return false;
    const [l, b, r, t] = obj.bounds;
    const areaRatio = ((r - l) * (t - b)) / pageArea;
    if (obj.object_type === "path" && areaRatio > 0.7) return false;
    if (obj.object_type === "image" && areaRatio > 0.85) return false;
    return true;
  });

  const hitTest = (clickX, clickY) => {
    const hits = [];
    for (const obj of filtered) {
      const [left, bottom, right, top] = obj.bounds;
      const x = left * scaleX;
      const y = (pdfHeight - top) * scaleY;
      const w = (right - left) * scaleX;
      const h = (top - bottom) * scaleY;
      if (clickX >= x && clickX <= x + w && clickY >= y && clickY <= y + h) {
        hits.push({ obj, area: w * h });
      }
    }
    // Sort smallest first — prefer selecting the innermost/smallest object
    hits.sort((a, b) => a.area - b.area);
    return hits.map((h) => h.obj);
  };

  // Click handler: find smallest unselected object under cursor, toggle it
  const handleOverlayClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const hits = hitTest(clickX, clickY);
    if (hits.length === 0) return;

    // If the smallest hit is already selected, deselect it.
    // Otherwise select the smallest unselected hit.
    const smallestUnselected = hits.find((o) => !selectedIndices.has(o.index));
    if (smallestUnselected) {
      onSelect(smallestUnselected.index);
    } else {
      // All hits are selected — deselect the smallest
      onSelect(hits[0].index);
    }
  };

  // Hover handler: highlight the smallest object under cursor
  const handleOverlayMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const hits = hitTest(clickX, clickY);
    if (hits.length > 0) {
      // Prefer smallest unselected, else smallest
      const best = hits.find((o) => !selectedIndices.has(o.index)) || hits[0];
      onHover(best.index);
    } else {
      onHover(null);
    }
  };

  return (
    <div
      className="absolute inset-0"
      style={{ width: displayW, height: displayH, zIndex: 5 }}
    >
      {/* Visual-only bounding boxes — all pointer-events:none */}
      {filtered.map((obj) => {
        const [left, bottom, right, top] = obj.bounds;
        const x = left * scaleX;
        const y = (pdfHeight - top) * scaleY;
        const w = (right - left) * scaleX;
        const h = (top - bottom) * scaleY;
        if (w < 2 || h < 2) return null;

        const colors = OBJECT_COLORS[obj.object_type] || OBJECT_COLORS.path;
        const isHovered = hoveredIdx === obj.index;
        const isSelected = selectedIndices.has(obj.index);
        const isHighlighted = isHovered || isSelected;
        const isImage = obj.object_type === "image";
        const isText = obj.object_type === "text";

        return (
          <div
            key={obj.index}
            className="absolute pointer-events-none transition-all duration-100"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${w}px`,
              height: `${h}px`,
              border: isImage
                ? `${isHighlighted ? 2.5 : 1.5}px ${isSelected ? "solid" : "dashed"} ${colors.border}`
                : isText
                ? `${isHighlighted ? 2 : 1}px ${isSelected ? "solid" : "dashed"} ${colors.border}`
                : `${isHighlighted ? 1.5 : 0.5}px solid ${colors.border}`,
              backgroundColor: isHighlighted ? colors.hoverBg : (isImage ? colors.bg : isText ? colors.bg : "transparent"),
              zIndex: 1,
              boxShadow: isSelected
                ? `0 0 0 2px ${colors.border}, 0 0 16px ${colors.bg}`
                : "none",
              borderRadius: isImage ? "2px" : isText ? "2px" : "0",
            }}
          >

            {/* Selection checkmark */}
            {isSelected && (
              <div
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: colors.border, zIndex: 2 }}
              >
                <svg className="w-2.5 h-2.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            )}
            {/* Hover label */}
            {isHovered && (
              <div
                className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap shadow-lg"
                style={{ backgroundColor: colors.border, color: "#0f172a", zIndex: 3 }}
              >
                {isImage ? `${obj.image_width}×${obj.image_height}px`
                  : isText && obj.text_content ? obj.text_content.slice(0, 50) + (obj.text_content.length > 50 ? "…" : "")
                  : `${obj.object_type} #${obj.index}`}
              </div>
            )}
          </div>
        );
      })}

      {/* Marquee rectangle visualization */}
      {marqueeActive && marqueeStart && marqueeEnd && (() => {
        const mx = Math.min(marqueeStart.x, marqueeEnd.x);
        const my = Math.min(marqueeStart.y, marqueeEnd.y);
        const mw = Math.abs(marqueeEnd.x - marqueeStart.x);
        const mh = Math.abs(marqueeEnd.y - marqueeStart.y);
        if (mw < 3 && mh < 3) return null;
        return (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${mx}px`,
              top: `${my}px`,
              width: `${mw}px`,
              height: `${mh}px`,
              border: "2px dashed rgba(244, 63, 94, 0.8)",
              backgroundColor: "rgba(244, 63, 94, 0.08)",
              zIndex: 15,
              borderRadius: "2px",
            }}
          />
        );
      })()}

      {/* Transparent interactive layer — handles clicks + marquee draw */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 10, cursor: "crosshair" }}
        onClick={(e) => {
          // Suppress click if a marquee drag just happened
          if (e.currentTarget._wasMarqueeDrag) {
            e.currentTarget._wasMarqueeDrag = false;
            return;
          }
          handleOverlayClick(e);
        }}
        onMouseMove={(e) => {
          if (marqueeActive && onMarqueeMove) {
            const rect = e.currentTarget.getBoundingClientRect();
            onMarqueeMove({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          } else {
            handleOverlayMove(e);
          }
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if (onMarqueeStart) {
            const rect = e.currentTarget.getBoundingClientRect();
            onMarqueeStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }
        }}
        onMouseUp={(e) => {
          if (marqueeActive && marqueeStart && marqueeEnd) {
            const mw = Math.abs(marqueeEnd.x - marqueeStart.x);
            const mh = Math.abs(marqueeEnd.y - marqueeStart.y);
            if (mw > 5 || mh > 5) {
              // This was a real marquee drag — flag to suppress the upcoming click
              e.currentTarget._wasMarqueeDrag = true;
            }
          }
          if (marqueeActive && onMarqueeEnd) {
            onMarqueeEnd();
          }
        }}
        onMouseLeave={() => {
          onHover(null);
          if (marqueeActive && onMarqueeEnd) {
            onMarqueeEnd();
          }
        }}
      />
    </div>
  );
}
