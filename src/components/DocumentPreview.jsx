import React, { useState } from 'react';
import { useApp } from '../context/useApp';
import DocumentPage from './DocumentPage';
import EditorToolbar from './EditorToolbar';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

const DocumentPreview = () => {
    const { documents, isProcessing, activeDocumentId, setActiveDocumentId } = useApp();
    const [zoom, setZoom] = useState(1);

    if (isProcessing) return <div className="document-processing">正在处理文件...</div>;
    if (documents.length === 0) return null;

    const visiblePage = documents.findIndex(doc => doc.id === activeDocumentId);
    const currentDoc = documents[visiblePage];
    if (!currentDoc) return null;

    return (
        <div className="document-editor">
            <EditorToolbar
                currentPage={visiblePage}
                pageCount={documents.length}
                zoom={zoom}
                onPrevious={() => setActiveDocumentId(documents[Math.max(0, visiblePage - 1)].id)}
                onNext={() => setActiveDocumentId(documents[Math.min(documents.length - 1, visiblePage + 1)].id)}
                onZoomIn={() => setZoom(value => Math.min(MAX_ZOOM, value + ZOOM_STEP))}
                onZoomOut={() => setZoom(value => Math.max(MIN_ZOOM, value - ZOOM_STEP))}
                onResetZoom={() => setZoom(1)}
            />
            <div className="document-canvas-viewport">
                <div className="document-zoom-layer" style={{ width: `${zoom * 100}%` }}>
                    <DocumentPage
                        key={currentDoc.id}
                        doc={currentDoc}
                        index={visiblePage}
                        totalPages={documents.length}
                    />
                </div>
            </div>
        </div>
    );
};

export default DocumentPreview;
