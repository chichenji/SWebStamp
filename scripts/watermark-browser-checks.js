import { prepareAssets } from '../src/utils/pageAssets.js';
import { composeScanPageCanvas } from '../src/utils/scanEffect/scanComposer.js';
import { generateWatermarkImage } from '../src/utils/watermarkHelper.js';
import { resolveWatermarkConfig } from '../src/utils/watermarkConfig.js';
import { drawPageWatermark } from '../src/utils/watermarkRenderer.js';
import { loadCanvasImage } from '../src/utils/stampRenderer.js';
import { createScanConfig } from '../src/utils/scanEffect/scanConstants.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const canvasOf = (width, height, color) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    if (color) {
        const context = canvas.getContext('2d');
        context.fillStyle = color;
        context.fillRect(0, 0, width, height);
    }
    return canvas;
};
const pixels = canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
const boundsOf = canvas => {
    const data = pixels(canvas);
    const points = [];
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const offset = (y * canvas.width + x) * 4;
            if (data[offset] < 240) points.push([x, y]);
        }
    }
    return { minX: Math.min(...points.map(p => p[0])), maxX: Math.max(...points.map(p => p[0])),
        minY: Math.min(...points.map(p => p[1])), maxY: Math.max(...points.map(p => p[1])), count: points.length };
};

export const checkScanWatermarks = async () => {
    const source = canvasOf(600, 800, 'white').toDataURL();
    const options = { pageDoc: { id: 'scan-watermark', previewUrl: source },
        scanConfig: createScanConfig({ enabled: true, paperTexture: 0, baseGray: 0,
            grain: 0, edgeShadow: 0, subtleBlur: 0, brightness: 0, contrast: 0 }) };
    const render = async layout => composeScanPageCanvas({ ...options,
        assets: await prepareAssets({ watermarkConfig: { text: 'SCAN', layout, color: '#000000', opacity: 1, angle: 0 }, pageCount: 1 }) });
    const single = await render('single');
    const array = await render('array');
    assert(boundsOf(single).count > 100, 'Single watermark must survive scanning');
    assert(boundsOf(array).count > boundsOf(single).count * 2, 'Array must remain repeated after scanning');
    return { scanSingleAndArray: 'PASS' };
};

export const checkWatermarkCanvas = async () => {
    const source = canvasOf(800, 1000, 'white');
    const config = resolveWatermarkConfig({ type: 'text', text: 'SINGLE', layout: 'single',
        angle: 0, opacity: 1, positionX: 25, positionY: 75, fontSize: 30, color: '#000000' });
    const asset = await prepareAssets({ watermarkConfig: config, pageCount: 1 });
    const options = { pageDoc: { id: 'watermark-probe', previewUrl: source.toDataURL() }, assets: asset };
    const single = await composeScanPageCanvas(options);
    const bounds = boundsOf(single);
    assert(bounds.count > 100, 'Single watermark must contain visible ink');
    assert(bounds.minX > 100 && bounds.maxX < 300 && bounds.minY > 700 && bounds.maxY < 800, 'Single watermark must appear only at requested position');
    const smaller = await composeScanPageCanvas({ ...options, preset: { scaleFactor: 0.67 } });
    const scaled = boundsOf(smaller);
    assert(Math.abs((scaled.minX + scaled.maxX) / 2 - 800 * 0.67 * 0.25) < 3, 'Quality scaling must retain X position');
    assert(Math.abs((scaled.minY + scaled.maxY) / 2 - 1000 * 0.67 * 0.75) < 5, 'Quality scaling must retain Y position');
    const array = await composeScanPageCanvas({ ...options,
        assets: await prepareAssets({ watermarkConfig: { ...config, layout: 'array' }, pageCount: 1 }) });
    const repeated = boundsOf(array);
    assert(repeated.count > bounds.count * 3 && repeated.maxX - repeated.minX > 500, 'Array must repeat across the page');
    const longText = await loadCanvasImage(await generateWatermarkImage({ ...config, text: 'Long single watermark is not clipped by the array tile' }));
    assert(longText.width > 600, 'Long single text must not be clipped to an array tile');
    let rejected = false;
    try { await generateWatermarkImage({ ...config, type: 'image', imageUrl: 'data:image/png;base64,broken' }); }
    catch { rejected = true; }
    assert(rejected, 'Broken image must reject explicitly');
    const image = canvasOf(60, 40, 'black').toDataURL();
    const imageResult = await composeScanPageCanvas({ ...options,
        assets: await prepareAssets({ watermarkConfig: { ...config, type: 'image', imageUrl: image }, pageCount: 1 }) });
    assert(boundsOf(imageResult).count === 2400, 'Image single watermark must draw exactly once');
    return { single: 'PASS', array: 'PASS', image: 'PASS', qualityScaling: 'PASS', longText: 'PASS', invalidImage: 'PASS' };
};

export const compareOverlayToComposition = async ({ config, sourceUrl }) => {
    const overlay = document.querySelector('[data-watermark-overlay]');
    await overlay.decode();
    const source = await loadCanvasImage(sourceUrl);
    const expected = canvasOf(source.width, source.height);
    const context = expected.getContext('2d');
    context.drawImage(source, 0, 0);
    context.drawImage(overlay, 0, 0);
    const assets = await prepareAssets({ watermarkConfig: config, pageCount: 1 });
    const composed = await composeScanPageCanvas({ pageDoc: { id: 'compare-ui', previewUrl: sourceUrl }, assets });
    assert(expected.toDataURL() === composed.toDataURL(), 'Visible overlay and exported composition must match pixel for pixel');
    const transparent = canvasOf(source.width, source.height);
    drawPageWatermark({ context: transparent.getContext('2d'), pageSize: transparent, asset: assets.watermark });
    assert(transparent.toDataURL() === overlay.src, 'Ordinary preview must use natural page dimensions');
    return composed.toDataURL();
};
