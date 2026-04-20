/// PdfPageManager.jsx - Component for managing PDF pages
/// Save as: src/components/PdfPageManager.jsx

import React, { useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './PdfPageManager.css';

export const PdfPageManager = ({ pages = [], onPagesReordered }) => {
  const [pageOrder, setPageOrder] = useState(pages.map((_, i) => i));
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle drag start
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  // Handle drag over
  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  // Handle drop
  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newOrder = [...pageOrder];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    
    setPageOrder(newOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Notify parent of reordering
    if (onPagesReordered) {
      onPagesReordered(newOrder);
    }
  };

  // Remove page
  const handleRemovePage = useCallback((index) => {
    if (window.confirm(`Remove page ${index + 1}?`)) {
      const newOrder = pageOrder.filter((_, i) => i !== index);
      setPageOrder(newOrder);
      if (onPagesReordered) {
        onPagesReordered(newOrder);
      }
    }
  }, [pageOrder, onPagesReordered]);

  // Render page thumbnail
  const renderPageThumbnail = (pageIndex) => {
    // This would need actual thumbnail rendering from PDF
    // For now, we show a placeholder
    return (
      <div key={pageIndex} className="page-thumbnail-item">
        <div className="page-number">{pageIndex + 1}</div>
        <div className="page-content">
          <div className="placeholder-thumbnail" />
        </div>
        <button
          className="remove-btn"
          onClick={() => handleRemovePage(pageIndex)}
          title="Remove page"
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <div className="page-manager-container">
      <h2>Page Management</h2>
      
      <div className="page-manager-controls">
        <button className="merge-btn">Merge Another PDF</button>
        <button className="save-btn">Save as New PDF</button>
      </div>

      <div className="pages-grid">
        {pageOrder.map((pageIndex, displayIndex) => (
          <div
            key={displayIndex}
            draggable
            onDragStart={() => handleDragStart(displayIndex)}
            onDragOver={(e) => handleDragOver(e, displayIndex)}
            onDrop={(e) => handleDrop(e, displayIndex)}
            onDragLeave={() => setDragOverIndex(null)}
            className={`page-grid-item ${dragOverIndex === displayIndex ? 'drag-over' : ''} ${draggedIndex === displayIndex ? 'dragging' : ''}`}
          >
            {renderPageThumbnail(displayIndex)}
          </div>
        ))}
      </div>

      {pageOrder.length === 0 && (
        <div className="empty-message">No pages loaded. Load a PDF first.</div>
      )}
    </div>
  );
};

export default PdfPageManager;
