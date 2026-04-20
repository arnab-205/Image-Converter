/// PdfViewer.jsx - Main PDF viewing component
/// Save as: src/components/PdfViewer.jsx

import React, { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const PdfViewer = () => {
  const [pdfPath, setPdfPath] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [renderedImage, setRenderedImage] = useState(null);
  const [layers, setLayers] = useState([]);
  const [activeLayers, setActiveLayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Load PDF file
  const handleLoadPdf = useCallback(async (filePath) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await invoke('pdf_load', { file_path: filePath });
      
      if (response.success) {
        setMetadata(response.metadata);
        setPages(response.pages);
        setPdfPath(filePath);
        setCurrentPageIndex(0);
        
        // Load layers
        const layersData = await invoke('pdf_get_layers', {});
        setLayers(layersData);
        
        // Set all layers active by default
        setActiveLayers(layersData.map(l => l.id));
        
        // Render first page
        await renderPage(0, layersData.map(l => l.id));
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(`Failed to load PDF: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Render page
  const renderPage = useCallback(async (pageIndex, activeLayerIds) => {
    if (!pages.length) return;
    
    setIsLoading(true);
    try {
      const page = pages[pageIndex];
      const response = await invoke('pdf_render_page', {
        request: {
          page_index: pageIndex,
          width: Math.floor(page.width * 2), // 2x for better quality
          height: Math.floor(page.height * 2),
          active_layers: activeLayerIds || activeLayers,
        },
      });

      if (response.success && response.image_data) {
        setRenderedImage(response.image_data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(`Failed to render page: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [pages, activeLayers]);

  // Navigate pages
  const goToPreviousPage = useCallback(() => {
    if (currentPageIndex > 0) {
      const newIndex = currentPageIndex - 1;
      setCurrentPageIndex(newIndex);
      renderPage(newIndex, activeLayers);
    }
  }, [currentPageIndex, activeLayers, renderPage]);

  const goToNextPage = useCallback(() => {
    if (currentPageIndex < pages.length - 1) {
      const newIndex = currentPageIndex + 1;
      setCurrentPageIndex(newIndex);
      renderPage(newIndex, activeLayers);
    }
  }, [currentPageIndex, pages.length, activeLayers, renderPage]);

  // Toggle layer visibility
  const toggleLayer = useCallback(async (layerId) => {
    const newActiveLayers = activeLayers.includes(layerId)
      ? activeLayers.filter(id => id !== layerId)
      : [...activeLayers, layerId];
    
    setActiveLayers(newActiveLayers);
    await renderPage(currentPageIndex, newActiveLayers);
  }, [activeLayers, currentPageIndex, renderPage]);

  // Export page
  const handleExportPage = useCallback(async (format) => {
    try {
      const filePath = `${pdfPath}-page${currentPageIndex + 1}.${format}`;
      const page = pages[currentPageIndex];
      
      const result = await invoke('pdf_export_page', {
        request: {
          page_index: currentPageIndex,
          output_path: filePath,
          width: Math.floor(page.width * 2),
          height: Math.floor(page.height * 2),
          format: format,
        },
      });

      if (result) {
        setError('');
        alert(`Page exported to ${filePath}`);
      }
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    }
  }, [pdfPath, currentPageIndex, pages]);

  return (
    <div className="space-y-6">
      {/* Load Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-300 border-b border-slate-700 pb-2">
          1. Load PDF
        </h2>
        <button
          onClick={() => {
            const path = prompt('Enter PDF file path:');
            if (path) handleLoadPdf(path);
          }}
          className="bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-lg text-sm font-semibold transition-colors"
        >
          Browse PDF File
        </button>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {metadata && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 space-y-1">
            <p className="text-sm text-slate-300">
              <span className="font-medium text-slate-400">Pages:</span> {metadata.page_count}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {metadata.file_path}
            </p>
          </div>
        )}
      </div>

      {/* Rendered Page Display */}
      {renderedImage && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-300 border-b border-slate-700 pb-2">
            2. Preview
          </h2>
          <div className="flex justify-center bg-slate-900/50 rounded-lg border border-slate-700 p-2 max-h-96 overflow-auto">
            <img
              src={renderedImage}
              alt={`Page ${currentPageIndex + 1}`}
              className="max-w-full object-contain rounded"
            />
          </div>

          {/* Page Navigation */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goToPreviousPage}
              disabled={currentPageIndex === 0}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 py-1.5 px-3 rounded-lg text-sm font-semibold transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-slate-400 font-medium">
              {currentPageIndex + 1} / {pages.length}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPageIndex >= pages.length - 1}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 py-1.5 px-3 rounded-lg text-sm font-semibold transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Layers Panel */}
      {layers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-300 border-b border-slate-700 pb-2">
            Layers
          </h2>
          <div className="space-y-2">
            {layers.map(layer => (
              <label key={layer.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeLayers.includes(layer.id)}
                  onChange={() => toggleLayer(layer.id)}
                  className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                />
                {layer.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Export Options */}
      {metadata && (
        <div className="space-y-4 pt-4 border-t border-slate-700">
          <h2 className="text-lg font-semibold text-slate-300">
            3. Export Page
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => handleExportPage('png')}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-2.5 px-4 rounded-lg text-sm font-bold transition-all active:scale-[0.98]"
            >
              Export PNG
            </button>
            <button
              onClick={() => handleExportPage('jpg')}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-2.5 px-4 rounded-lg text-sm font-bold transition-all active:scale-[0.98]"
            >
              Export JPG
            </button>
            <button
              onClick={() => handleExportPage('webp')}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-2.5 px-4 rounded-lg text-sm font-bold transition-all active:scale-[0.98]"
            >
              Export WEBP
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="text-sm text-slate-400 animate-pulse">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
