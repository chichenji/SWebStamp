import { useState } from 'react';
import { useWatermarkPreferences } from './useWatermarkPreferences.js';

export const useDocumentLayers = (storage) => {
    const [crossPageStamp, setCrossPageStamp] = useState(null);
    const [crossPagePreview, setCrossPagePreview] = useState(null);
    const watermark = useWatermarkPreferences(storage);

    return {
        crossPageStamp,
        crossPagePreview,
        setCrossPagePreview,
        ...watermark,
        applyCrossPageStamp: (config) => setCrossPageStamp({ id: `cross-${Date.now()}`, ...config }),
        updateCrossPageStamp: (updates) => setCrossPageStamp(prev => prev ? { ...prev, ...updates } : null),
        clearCrossPageStamp: () => setCrossPageStamp(null)
    };
};
