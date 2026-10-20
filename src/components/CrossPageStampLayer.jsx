import React, { useEffect, useState } from 'react';
import { sliceStampImage } from '../utils/pdfUtils';
import { getStampFilter, normalizeStampAppearance } from '../utils/stampAppearance';

const CrossPageStampLayer = ({ config, index, pageCount }) => {
    const [slice, setSlice] = useState(null);
    const [dimensions, setDimensions] = useState(null);

    useEffect(() => {
        if (!config || pageCount === 0) return undefined;

        const generateSlice = async () => {
            const result = await sliceStampImage({
                stampUrl: config.stampUrl,
                pageCount,
                rotation: config.rotation,
                xOffsetRatio: config.xOffset
            });
            setSlice(result.slices[index] || null);
            setDimensions(result);
        };

        generateSlice().catch(error => {
            console.error('生成骑缝章切片失败:', error);
            setSlice(null);
        });
        return undefined;
    }, [config, index, pageCount]);

    if (!slice || !config || !dimensions) return null;

    const appearance = normalizeStampAppearance(config);
    const renderHeight = config.size * (dimensions.height / dimensions.originalHeight);

    return (
        <div
            className="cross-page-stamp-layer"
            style={{
                [config.position === 'left' ? 'left' : 'right']: 0,
                top: `${config.yPercent * 100}%`,
                height: `${renderHeight * 100}%`
            }}
        >
            <img
                src={slice}
                alt={`骑缝章第 ${index + 1} 页`}
                style={{
                    opacity: appearance.opacity,
                    filter: getStampFilter(appearance),
                    mixBlendMode: appearance.blendMode
                }}
            />
        </div>
    );
};

export default CrossPageStampLayer;
