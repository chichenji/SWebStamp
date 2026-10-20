import { generateWatermarkImage } from './watermarkHelper.js';
import { sliceStampImage } from './pdfDocument.js';
import { loadCanvasImage } from './stampRenderer.js';

export const prepareAssets = async ({ watermarkConfig, crossPageStamp, pageCount }) => {
    const watermarkUrl = watermarkConfig ? await generateWatermarkImage(watermarkConfig) : null;
    const watermarkPattern = watermarkUrl ? await loadCanvasImage(watermarkUrl) : null;
    const crossPageData = crossPageStamp?.stampUrl ? await sliceStampImage({
        stampUrl: crossPageStamp.stampUrl, pageCount,
        rotation: crossPageStamp.rotation, xOffsetRatio: crossPageStamp.xOffset
    }) : null;
    return { watermark: { image: watermarkPattern, config: watermarkConfig }, crossPageData, imageCache: new Map() };
};
