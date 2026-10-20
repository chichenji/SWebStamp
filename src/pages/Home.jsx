import React, { useState } from 'react';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import HomeHeader from '../components/HomeHeader';
import HomeWorkspace from '../components/HomeWorkspace';
import ScanEffectTool from '../components/ScanEffectTool';
import CrossPageStampTool from '../components/CrossPageStampTool';
import ExportModal from '../components/ExportModal';
import VerifyModal from '../components/VerifyModal';
import WatermarkTool from '../components/WatermarkTool';
import { useApp } from '../context/useApp';
import { exportImages, exportPdf } from '../utils/pdfUtils';
import { createPlacedStamp } from '../utils/stampPlacement';
import { getDroppedStampPlacement } from '../utils/stampDrop';

const Home = () => {
    const { addPlacedStamp, crossPageStamp, documents, placedStamps, watermarkConfig, getPageScanConfig } = useApp();
    const [showScanTool, setShowScanTool] = useState(false);
    const [draggedStamp, setDraggedStamp] = useState(null);
    const [showCrossPageTool, setShowCrossPageTool] = useState(false);
    const [showWatermarkTool, setShowWatermarkTool] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const handleDragStart = ({ active }) => {
        if (active.data.current?.type === 'stamp-library') {
            setDraggedStamp(active.data.current.stamp);
        }
    };

    const handleDragEnd = async (event) => {
        setDraggedStamp(null);
        const source = event.active.data.current;
        const target = event.over?.data.current;
        if (source?.type !== 'stamp-library' || target?.type !== 'document-page') return;

        const placement = await getDroppedStampPlacement(event);
        addPlacedStamp(target.docId, createPlacedStamp({
            id: crypto.randomUUID(),
            sourceStamp: source.stamp,
            placement
        }));
    };

    const handleExport = (settings) => {
        const options = { documents, placedStamps, crossPageStamp, watermarkConfig,
            settings: { ...settings, getPageScanConfig } };
        return settings.exportFormat === 'images' ? exportImages(options) : exportPdf(options);
    };

    return (
        <div className="app-shell">
            <HomeHeader pageCount={documents.length} onScan={() => setShowScanTool(true)}
                onVerify={() => setIsVerifyModalOpen(true)} onExport={() => setIsExportModalOpen(true)} />
            <HomeWorkspace documents={documents} sensors={sensors} draggedStamp={draggedStamp} actions={{
                onDragStart: handleDragStart, onDragCancel: () => setDraggedStamp(null), onDragEnd: handleDragEnd,
                onOpenCrossPageTool: () => setShowCrossPageTool(true), onOpenWatermarkTool: () => setShowWatermarkTool(true)
            }} />

            <CrossPageStampTool isOpen={showCrossPageTool} onClose={() => setShowCrossPageTool(false)} />
            <WatermarkTool isOpen={showWatermarkTool} onClose={() => setShowWatermarkTool(false)} />
            <ScanEffectTool isOpen={showScanTool} onClose={() => setShowScanTool(false)} />
            <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onConfirm={handleExport} />
            <VerifyModal isOpen={isVerifyModalOpen} onClose={() => setIsVerifyModalOpen(false)} />
        </div>
    );
};

export default Home;
