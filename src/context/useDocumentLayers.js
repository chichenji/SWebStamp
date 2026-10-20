import { useState } from 'react';
import { DEFAULT_WATERMARK } from '../utils/watermarkConfig.js';

export const useDocumentLayers = () => {
    const [crossPageStamp, setCrossPageStamp] = useState(null);
    const [crossPagePreview, setCrossPagePreview] = useState(null);
    const [watermarkConfig, setWatermarkConfig] = useState(null);
    const updateWatermarkConfig = updates => setWatermarkConfig(previous => ({ ...DEFAULT_WATERMARK, ...previous, ...updates }));
    const applyCrossPageStamp = config => setCrossPageStamp({ id: `cross-${Date.now()}`, ...config });
    const updateCrossPageStamp = updates => setCrossPageStamp(previous => previous ? { ...previous, ...updates } : null);
    return { crossPageStamp, crossPagePreview, setCrossPagePreview, watermarkConfig,
        updateWatermarkConfig, clearWatermarkConfig: () => setWatermarkConfig(null), applyCrossPageStamp,
        updateCrossPageStamp, clearCrossPageStamp: () => setCrossPageStamp(null) };
};
