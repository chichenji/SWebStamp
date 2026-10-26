import { drawStampOnCanvas, loadCanvasImage } from '../stampRenderer.js';
import { calculateScanGeometry } from './scanGeometry.js';
import { createSeedFromId } from './scanNoise.js';
import { processCanvasStage } from './scanWorkerClient.js';
import { normalizeScanConfig } from './scanConstants.js';
import { drawPageWatermark } from '../watermarkRenderer.js';
import { drawBaseImageOnCanvas } from '../imageAdjustment.js';

const DEG_TO_RAD = Math.PI / 180;

export const createPageCanvas = (baseImage, preset = { scaleFactor: 1 }, { opaque = false, imageAdjustments = null } = {}) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(baseImage.width * preset.scaleFactor);
    canvas.height = Math.round(baseImage.height * preset.scaleFactor);
    const context = canvas.getContext('2d');
    if (opaque || preset.format === 'JPEG') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
    }
    drawBaseImageOnCanvas({
        context,
        image: baseImage,
        width: canvas.width,
        height: canvas.height,
        imageAdjustments
    });
    return canvas;
};

const drawWatermark = ({ context, canvas, asset, scaleFactor }) => {
    context.save();
    context.scale(scaleFactor, scaleFactor);
    drawPageWatermark({ context, asset, pageSize: { width: canvas.width / scaleFactor, height: canvas.height / scaleFactor } });
    context.restore();
};

const getCachedImage = async (url, cache) => {
    if (!cache) return loadCanvasImage(url);
    if (!cache.has(url)) cache.set(url, loadCanvasImage(url));
    return cache.get(url);
};

const drawPlacedStamps = async ({ context, canvas, stamps = [], imageCache }) => {
    for (const stamp of stamps) {
        const image = await getCachedImage(stamp.url, imageCache);
        drawStampOnCanvas({ context, image, stamp, pageSize: canvas });
    }
};

const getCrossPagePlacement = ({ crossPageData, crossPageStamp, pageCount, canvas }) => {
    const heightPercent = crossPageStamp.size * (crossPageData.height / crossPageData.originalHeight);
    const slicePixelRatio = (crossPageData.width / pageCount) / crossPageData.height;
    const widthPercent = slicePixelRatio * heightPercent * (canvas.height / canvas.width);
    return {
        ...crossPageStamp,
        xPercent: crossPageStamp.position === 'left' ? 0 : 1 - widthPercent,
        yPercent: crossPageStamp.yPercent,
        widthPercent,
        heightPercent,
        rotation: 0
    };
};

const drawCrossPageStamp = async ({ context, canvas, index, pageCount, assets, crossPageStamp }) => {
    if (!assets?.crossPageData?.slices[index]) return;
    const image = await getCachedImage(assets.crossPageData.slices[index], assets?.imageCache);
    const stamp = getCrossPagePlacement({
        crossPageData: assets.crossPageData,
        crossPageStamp,
        pageCount,
        canvas
    });
    drawStampOnCanvas({ context, image, stamp, pageSize: canvas });
};

const applyTransformedGeometry = (sourceCanvas, scanConfig) => {
    const geometry = calculateScanGeometry({
        sourceWidth: sourceCanvas.width,
        sourceHeight: sourceCanvas.height,
        fitToA4: scanConfig.fitToA4,
        tiltAngle: scanConfig.tiltAngle || 0
    });
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = geometry.targetWidth;
    targetCanvas.height = geometry.targetHeight;
    const context = targetCanvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    context.save();
    context.translate(geometry.centerX, geometry.centerY);
    context.rotate(geometry.rotationDegrees * DEG_TO_RAD);
    context.drawImage(
        sourceCanvas,
        -geometry.contentWidth / 2,
        -geometry.contentHeight / 2,
        geometry.contentWidth,
        geometry.contentHeight
    );
    context.restore();
    return targetCanvas;
};

const applyScanPipeline = async ({ canvas, config, seed, signal }) => {
    if (!config.preserveStampColors) {
        await processCanvasStage({ canvas, config, seed, stage: 'tone', signal });
    }
    const target = applyTransformedGeometry(canvas, config);
    await processCanvasStage({ canvas: target, config, seed, stage: 'optics', signal });
    return target;
};

const drawPageDecorations = async ({ context, canvas, options, assets }) => {
    await drawPlacedStamps({ context, canvas, stamps: options.stamps, imageCache: assets.imageCache });
    await drawCrossPageStamp({
        context,
        canvas,
        index: options.index ?? 0,
        pageCount: options.pageCount ?? 1,
        assets,
        crossPageStamp: options.crossPageStamp
    });
};

export const composeScanPageCanvas = async (options) => {
    const { pageDoc, signal } = options;
    const preset = options.preset ?? { scaleFactor: 1 };
    const assets = options.assets ?? {};
    const baseImage = await getCachedImage(pageDoc.previewUrl, assets.imageCache);
    const config = normalizeScanConfig(options.scanConfig ?? {});
    const canvas = createPageCanvas(baseImage, preset, {
        opaque: config.enabled,
        imageAdjustments: pageDoc.imageAdjustments
    });
    const context = canvas.getContext('2d');
    const seed = config.enabled ? createSeedFromId(pageDoc.id) : 0;

    if (signal) signal.throwIfAborted();
    drawWatermark({ context, canvas, asset: assets.watermark, scaleFactor: preset.scaleFactor });

    if (config.enabled && config.preserveStampColors) {
        await processCanvasStage({ canvas, config, seed, stage: 'tone', signal });
    }

    await drawPageDecorations({ context, canvas, options, assets });

    if (!config.enabled) return canvas;
    return applyScanPipeline({ canvas, config, seed, signal });
};
