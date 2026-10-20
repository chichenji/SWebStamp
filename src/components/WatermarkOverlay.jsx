import React, { useState, useEffect } from 'react';
import { useApp } from '../context/useApp';
import { generateWatermarkImage } from '../utils/watermarkHelper.js';
import { drawPageWatermark } from '../utils/watermarkRenderer.js';
import { loadCanvasImage } from '../utils/stampRenderer.js';

const WatermarkOverlay = ({ sourceUrl }) => {
    const { watermarkConfig } = useApp();
    const [result, setResult] = useState(null);
    useEffect(() => {
        if (!watermarkConfig) return undefined;
        let current = true;
        const render = async () => {
            try {
                const [source, watermarkUrl] = await Promise.all([loadCanvasImage(sourceUrl), generateWatermarkImage(watermarkConfig)]);
                const canvas = document.createElement('canvas');
                canvas.width = source.width;
                canvas.height = source.height;
                const image = watermarkUrl ? await loadCanvasImage(watermarkUrl) : null;
                drawPageWatermark({ context: canvas.getContext('2d'), pageSize: canvas, asset: { image, config: watermarkConfig } });
                if (current) setResult({ config: watermarkConfig, sourceUrl, url: canvas.toDataURL() });
            } catch (error) {
                if (current) setResult({ config: watermarkConfig, sourceUrl, error: error.message });
            }
        };
        render();
        return () => { current = false; };
    }, [sourceUrl, watermarkConfig]);
    if (!watermarkConfig || result?.config !== watermarkConfig || result?.sourceUrl !== sourceUrl) return null;
    if (result.error) return <div role="alert" className="scan-render-status scan-render-error">水印预览失败：{result.error}</div>;
    return <img src={result.url} alt="水印图层" data-watermark-overlay className="absolute inset-0 pointer-events-none"
        style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }} />;
};
export default WatermarkOverlay;
