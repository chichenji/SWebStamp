import React, { useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { X } from 'lucide-react';
import { useApp } from '../context/useApp';
import CrossPageStampLayer from './CrossPageStampLayer';
import StampOverlay from './StampOverlay';
import WatermarkOverlay from './WatermarkOverlay';
import ScanPreviewCanvas from './ScanPreviewCanvas';
import { useScanPreview } from './useScanPreview';

const EMPTY_STAMPS = Object.freeze([]);
const getInteractionStyle = geometry => ({
    left: `${(geometry.targetWidth - geometry.contentWidth) / geometry.targetWidth * 50}%`,
    top: `${(geometry.targetHeight - geometry.contentHeight) / geometry.targetHeight * 50}%`,
    width: `${geometry.contentWidth / geometry.targetWidth * 100}%`,
    height: `${geometry.contentHeight / geometry.targetHeight * 100}%`,
    transform: `rotate(${geometry.rotationDegrees}deg)`
});

const PageStampLayer = ({ docId, stamps, geometry, crossPage, actions }) => (
    <div className={geometry ? 'scan-interaction-layer' : 'document-interaction-layer'}
        style={geometry ? getInteractionStyle(geometry) : undefined}>
        {stamps.map(stamp => <StampOverlay key={stamp.id} stamp={stamp}
            isSelected={actions.selected?.docId === docId && actions.selected.stampId === stamp.id}
            onSelect={() => actions.select(stamp.id)} onDelete={() => actions.remove(docId, stamp.id)}
            onUpdate={actions.update} pageRotation={geometry?.rotationDegrees ?? 0} />)}
        {crossPage}
    </div>
);

const DocumentPage = ({ doc, index, totalPages }) => {
    const { crossPagePreview, crossPageStamp, placedStamps, removeDocument, removePlacedStamp,
        selectedPlacedStamp, setSelectedPlacedStamp, updatePlacedStamp, getPageScanConfig,
        compareOriginal, watermarkConfig } = useApp();
    const pageStamps = placedStamps[doc.id] || EMPTY_STAMPS;
    const crossPageConfig = crossPagePreview || crossPageStamp;
    const scanConfig = getPageScanConfig(doc.id);
    const scanning = scanConfig.enabled && !compareOriginal;
    const preview = useScanPreview({ doc, stamps: pageStamps, index, pageCount: totalPages,
        crossPageStamp: crossPageConfig, watermarkConfig, scanConfig, enabled: scanning });
    const geometry = scanning ? preview.geometry : null;
    const { isOver, setNodeRef } = useDroppable({
        id: `document-page-${doc.id}`,
        data: { type: 'document-page', docId: doc.id, geometry }
    });
    const selectStamp = useCallback(stampId => {
        setSelectedPlacedStamp({ docId: doc.id, stampId });
    }, [doc.id, setSelectedPlacedStamp]);
    const updateStamp = useCallback((stampId, updates) => {
        updatePlacedStamp(doc.id, stampId, updates);
    }, [doc.id, updatePlacedStamp]);

    return (
        <article className="document-sheet">
            <button type="button" className="document-remove-button" onClick={() => removeDocument(doc.id)} title="删除当前页面">
                <X size={15} />
            </button>
            <div
                ref={setNodeRef}
                className={`document-page-surface ${isOver ? 'is-drop-target' : ''}`}
                onPointerDown={event => {
                    if (event.target === event.currentTarget || event.target.hasAttribute('data-page-image')) {
                        setSelectedPlacedStamp(null);
                    }
                }}
            >
                {scanning ? <>
                    {preview.canvas ? <ScanPreviewCanvas canvas={preview.canvas} /> : <div className="scan-error-placeholder" />}
                    {preview.pending && <div role="status" className="scan-render-status">正在生成扫描预览…</div>}
                    {preview.error && <div role="alert" className="scan-render-status scan-render-error">扫描失败：{preview.error}</div>}
                </> : <><img data-page-image src={doc.previewUrl} alt={doc.name} /><WatermarkOverlay sourceUrl={doc.previewUrl} /></>}
                <PageStampLayer docId={doc.id} stamps={pageStamps} geometry={geometry}
                    actions={{ selected: selectedPlacedStamp, select: selectStamp, update: updateStamp, remove: removePlacedStamp }}
                    crossPage={!scanning && <CrossPageStampLayer config={crossPageConfig} index={index} pageCount={totalPages} />} />
                {isOver && <div className="document-drop-outline" />}
            </div>
            <footer>第 {index + 1} 页</footer>
        </article>
    );
};

export default DocumentPage;
