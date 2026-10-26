import { resolveWatermarkConfig } from './watermarkConfig.js';
import { loadCanvasImage } from './stampRenderer.js';

const DEFAULT_MAX_IMAGE_SIZE = 240;
const TEXT_PADDING_X = 16;
const TEXT_PADDING_Y = 16;
const LINE_HEIGHT_FACTOR = 1.2;
const MIN_LINE_GAP = 8;
const getFont = config => `bold ${config.fontSize}px sans-serif`;

const getLineMetrics = (context, line) => {
    if (line === '') {
        return { width: 0, ascent: 0, descent: 0, left: 0, right: 0 };
    }
    const metrics = context.measureText(line);
    const isValid = (
        metrics &&
        Number.isFinite(metrics.width) &&
        Number.isFinite(metrics.actualBoundingBoxAscent) &&
        Number.isFinite(metrics.actualBoundingBoxDescent) &&
        Number.isFinite(metrics.actualBoundingBoxLeft) &&
        Number.isFinite(metrics.actualBoundingBoxRight)
    );
    if (!isValid) {
        throw new Error('Canvas 2D measureText does not provide required actualBoundingBox metrics');
    }
    return {
        width: metrics.width,
        ascent: metrics.actualBoundingBoxAscent,
        descent: metrics.actualBoundingBoxDescent,
        left: metrics.actualBoundingBoxLeft,
        right: metrics.actualBoundingBoxRight
    };
};

export const measureWatermarkContent = ({ context, config, image }) => {
    if (image) {
        if (!Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width <= 0 || image.height <= 0) {
            throw new Error('Watermark image has invalid dimensions');
        }
        const ratio = Math.min(1, DEFAULT_MAX_IMAGE_SIZE / image.width, DEFAULT_MAX_IMAGE_SIZE / image.height);
        return {
            width: Math.ceil(image.width * ratio),
            height: Math.ceil(image.height * ratio)
        };
    }
    context.font = getFont(config);
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    const lines = String(config.text ?? '').split('\n');
    const lineMetrics = lines.map(line => getLineMetrics(context, line));
    const maxLeft = Math.max(0, ...lineMetrics.map(m => m.left));
    const maxRight = Math.max(0, ...lineMetrics.map(m => m.right));
    const centerX = Math.ceil(TEXT_PADDING_X + maxLeft);
    const width = Math.ceil(maxLeft + maxRight + 2 * TEXT_PADDING_X);

    const baselineY = [];
    lines.forEach((_, index) => {
        if (index === 0) {
            baselineY.push(Math.ceil(TEXT_PADDING_Y + lineMetrics[0].ascent));
            return;
        }
        const prev = lineMetrics[index - 1];
        const current = lineMetrics[index];
        const minAdvance = prev.descent + current.ascent + MIN_LINE_GAP;
        const advance = Math.max(Math.ceil(config.fontSize * LINE_HEIGHT_FACTOR), Math.ceil(minAdvance));
        baselineY.push(baselineY[index - 1] + advance);
    });
    const lastIndex = lines.length - 1;
    const lastDescent = lineMetrics[lastIndex]?.descent ?? 0;
    const height = Math.ceil(baselineY[lastIndex] + lastDescent + TEXT_PADDING_Y);
    return { width, height, centerX, baselineY };
};

const drawContent = ({ context, canvas, config, content }) => {
    if (content.image) {
        context.drawImage(content.image, 0, 0, canvas.width, canvas.height);
        return;
    }
    context.fillStyle = config.color;
    context.font = getFont(config);
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    const lines = String(config.text ?? '').split('\n');
    lines.forEach((line, index) => {
        context.fillText(line, content.size.centerX, content.size.baselineY[index]);
    });
};

export const generateWatermarkImage = async input => {
    if (!input) return null;
    const config = resolveWatermarkConfig(input);
    if (config.type === 'text' && !config.text) return null;
    if (config.type === 'image' && !config.imageUrl) return null;

    const image = config.type === 'image' ? await loadCanvasImage(config.imageUrl) : null;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const size = measureWatermarkContent({ context, config, image });

    canvas.width = Math.max(1, size.width);
    canvas.height = Math.max(1, size.height);
    context.globalAlpha = config.opacity;
    drawContent({ context, canvas, config, content: { image, size } });
    return canvas.toDataURL('image/png');
};
