import React, { useState } from 'react';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import HomeHeader from '../components/HomeHeader';
import HomeWorkspace from '../components/HomeWorkspace';
import ScanEffectTool from '../components/ScanEffectTool';
import CrossPageStampTool from '../components/CrossPageStampTool';
import ExportModal from '../components/ExportModal';
import VerifyModal from '../components/VerifyModal';
import WatermarkTool from '../components/WatermarkTool';
import ImageAdjustmentTool from '../components/ImageAdjustmentTool';
import { useApp } from '../context/useApp';
import { exportImages, exportPdf } from '../utils/pdfUtils';
import { createPlacedStamp } from '../utils/stampPlacement';
import { getDroppedStampPlacement } from '../utils/stampDrop';

const HomeModals = ({ modals, onClose, onExport }) => (
    <>
        <CrossPageStampTool isOpen={modals.crossPage} onClose={() => onClose('crossPage')} />
        <WatermarkTool isOpen={modals.watermark} onClose={() => onClose('watermark')} />
        <ScanEffectTool isOpen={modals.scan} onClose={() => onClose('scan')} />
        <ImageAdjustmentTool isOpen={modals.imageAdjustment} onClose={() => onClose('imageAdjustment')} />
        <ExportModal isOpen={modals.export} onClose={() => onClose('export')} onConfirm={onExport} />
        <VerifyModal isOpen={modals.verify} onClose={() => onClose('verify')} />
    </>
);

const Home = () => {
    const { addPlacedStamp, crossPageStamp, documents, placedStamps, watermarkConfig, getPageScanConfig, stampPreferences } = useApp();
    const [modals, setModals] = useState({ scan: false, imageAdjustment: false, crossPage: false, watermark: false, export: false, verify: false });
    const [draggedStamp, setDraggedStamp] = useState(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const setModal = (key, open) => setModals(prev => ({ ...prev, [key]: open }));

    const handleDragEnd = async (event) => {
        setDraggedStamp(null);
        const source = event.active.data.current;
        const target = event.over?.data.current;
        if (source?.type !== 'stamp-library' || target?.type !== 'document-page') return;

        const placement = await getDroppedStampPlacement(event, stampPreferences?.widthPercent);
        addPlacedStamp(target.docId, createPlacedStamp({
            id: crypto.randomUUID(), sourceStamp: source.stamp, placement, initialPreferences: stampPreferences
        }));
    };

    const handleExport = (settings) => {
        const options = { documents, placedStamps, crossPageStamp, watermarkConfig, settings: { ...settings, getPageScanConfig } };
        return settings.exportFormat === 'images' ? exportImages(options) : exportPdf(options);
    };

    return (
        <div className="app-shell">
            <HomeHeader pageCount={documents.length} onAdjustImage={() => setModal('imageAdjustment', true)}
                onScan={() => setModal('scan', true)} onVerify={() => setModal('verify', true)} onExport={() => setModal('export', true)} />
            <HomeWorkspace documents={documents} sensors={sensors} draggedStamp={draggedStamp} actions={{
                onDragStart: ({ active }) => active.data.current?.type === 'stamp-library' && setDraggedStamp(active.data.current.stamp),
                onDragCancel: () => setDraggedStamp(null), onDragEnd: handleDragEnd,
                onOpenCrossPageTool: () => setModal('crossPage', true), onOpenWatermarkTool: () => setModal('watermark', true)
            }} />
            <HomeModals modals={modals} onClose={(key) => setModal(key, false)} onExport={handleExport} />
        </div>
    );
};

export default Home;
