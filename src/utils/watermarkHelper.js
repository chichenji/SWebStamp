import { resolveWatermarkConfig } from './watermarkConfig.js';
import { loadCanvasImage } from './stampRenderer.js';

const TILE_SIZE = 200;
const IMAGE_FILL = 0.8;
const LINE_HEIGHT = 1.2;
const PADDING = 4;
const DEG_TO_RAD = Math.PI / 180;
const getFont = config => `bold ${config.fontSize}px sans-serif`;

const measureContent = ({ context, config, image }) => {
    if (image) {
        const maxSize = TILE_SIZE * config.density * IMAGE_FILL;
        const ratio = Math.min(1, maxSize / image.width, maxSize / image.height);
        return { width: image.width * ratio, height: image.height * ratio };
    }
    context.font = getFont(config);
    const lines = config.text.split('\n');
    return { width: Math.max(...lines.map(line => context.measureText(line).width)) + PADDING,
        height: lines.length * config.fontSize * LINE_HEIGHT };
};

const sizeCanvas = ({ canvas, config, size }) => {
    if (config.layout === 'array') {
        canvas.width = canvas.height = TILE_SIZE * config.density;
        return;
    }
    const radians = config.angle * DEG_TO_RAD;
    const cosine = Math.abs(Math.cos(radians));
    const sine = Math.abs(Math.sin(radians));
    canvas.width = Math.ceil(size.width * cosine + size.height * sine + PADDING);
    canvas.height = Math.ceil(size.width * sine + size.height * cosine + PADDING);
};

const drawContent = ({ context, config, content }) => {
    if (content.image) {
        context.drawImage(content.image, -content.size.width / 2, -content.size.height / 2, content.size.width, content.size.height);
        return;
    }
    context.fillStyle = config.color;
    context.font = getFont(config);
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    const lines = config.text.split('\n');
    const lineHeight = config.fontSize * LINE_HEIGHT;
    lines.forEach((line, index) => context.fillText(line, 0, (index - (lines.length - 1) / 2) * lineHeight));
};

export const generateWatermarkImage = async input => {
    if (!input) return null;
    const config = resolveWatermarkConfig(input);
    if (config.type === 'text' && !config.text) return null;
    if (config.type === 'image' && !config.imageUrl) return null;
    const image = config.type === 'image' ? await loadCanvasImage(config.imageUrl) : null;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const size = measureContent({ context, config, image });
    sizeCanvas({ canvas, config, size });
    context.globalAlpha = config.opacity;
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(config.angle * DEG_TO_RAD);
    drawContent({ context, config, content: { image, size } });
    return canvas.toDataURL('image/png');
};
