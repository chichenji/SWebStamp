import pdfjsLib from './pdfRuntime.js';
import { loadCanvasImage } from './stampRenderer.js';

export const QUALITY_PRESETS = Object.freeze({
    min: Object.freeze({ scaleFactor: 0.67, format: 'JPEG', jpegQuality: 0.5, label: '最小体积', desc: '适合邮件发送' }),
    balanced: Object.freeze({ scaleFactor: 0.8, format: 'JPEG', jpegQuality: 0.7, label: '均衡', desc: '体积与清晰度平衡' }),
    high: Object.freeze({ scaleFactor: 1, format: 'JPEG', jpegQuality: 0.85, label: '高清', desc: '接近原始画质' }),
    original: Object.freeze({ scaleFactor: 1, format: 'PNG', jpegQuality: 1, label: '原始 PNG', desc: '无损输出' })
});

const createRotatedStampCanvas = (image, rotation) => {
    const radians = rotation * Math.PI / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    const width = rotation % 360 === 0 ? image.width : image.width * cos + image.height * sin;
    const height = rotation % 360 === 0 ? image.height : image.width * sin + image.height * cos;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.translate(width / 2, height / 2);
    context.rotate(radians);
    context.drawImage(image, -image.width / 2, -image.height / 2);
    return canvas;
};

const createStampSlices = ({ sourceCanvas, pageCount, xOffsetRatio }) => {
    const sliceWidth = Math.ceil(sourceCanvas.width / pageCount);
    const xOffset = xOffsetRatio * sourceCanvas.width;
    return Array.from({ length: pageCount }, (_, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = sliceWidth;
        canvas.height = sourceCanvas.height;
        canvas.getContext('2d').drawImage(
            sourceCanvas,
            index * sliceWidth + xOffset,
            0,
            sliceWidth,
            sourceCanvas.height,
            0,
            0,
            sliceWidth,
            sourceCanvas.height
        );
        return canvas.toDataURL('image/png');
    });
};

export const sliceStampImage = async ({
    stampUrl,
    pageCount,
    rotation = 0,
    xOffsetRatio = 0
}) => {
    const image = await loadCanvasImage(stampUrl);
    const sourceCanvas = createRotatedStampCanvas(image, rotation);
    return {
        slices: createStampSlices({ sourceCanvas, pageCount, xOffsetRatio }),
        width: sourceCanvas.width,
        height: sourceCanvas.height,
        originalWidth: image.width,
        originalHeight: image.height
    };
};

export const getStampDimensions = async (stampUrl) => {
    const image = await loadCanvasImage(stampUrl);
    return { width: image.width, height: image.height, aspectRatio: image.width / image.height };
};

const renderPdfPage = async (page, file, pageNumber) => {
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    return {
        id: `${file.name}-page-${pageNumber}-${crypto.randomUUID()}`,
        file: null,
        type: 'image/png',
        name: `${file.name} - Page ${pageNumber}`,
        previewUrl: canvas.toDataURL('image/png')
    };
};

export const convertPdfToImages = async (file) => {
    const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
    const images = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        images.push(await renderPdfPage(page, file, pageNumber));
    }
    return images;
};
