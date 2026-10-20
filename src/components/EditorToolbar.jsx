import React from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Scan } from 'lucide-react';

const IconButton = ({ children, disabled, onClick, title }) => (
    <button type="button" className="editor-icon-button" disabled={disabled} onClick={onClick} title={title}>
        {children}
    </button>
);

const EditorToolbar = ({ currentPage, pageCount, zoom, onPrevious, onNext, onZoomIn, onZoomOut, onResetZoom }) => (
    <div className="editor-toolbar">
        <div className="editor-toolbar-group">
            <IconButton disabled={currentPage === 0} onClick={onPrevious} title="上一页"><ChevronLeft size={18} /></IconButton>
            <span className="page-counter">{currentPage + 1} / {pageCount}</span>
            <IconButton disabled={currentPage === pageCount - 1} onClick={onNext} title="下一页"><ChevronRight size={18} /></IconButton>
        </div>
        <div className="toolbar-divider" />
        <div className="editor-toolbar-group">
            <IconButton disabled={zoom <= 0.5} onClick={onZoomOut} title="缩小"><Minus size={17} /></IconButton>
            <span className="zoom-counter">{Math.round(zoom * 100)}%</span>
            <IconButton disabled={zoom >= 3} onClick={onZoomIn} title="放大"><Plus size={17} /></IconButton>
            <IconButton onClick={onResetZoom} title="适合窗口"><Scan size={17} /></IconButton>
        </div>
    </div>
);

export default EditorToolbar;
