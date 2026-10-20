import {
    getCanvasCompositeOperation,
    getStampFilter,
    normalizeStampAppearance
} from './stampAppearance.js';

const DEGREES_TO_RADIANS = Math.PI / 180;

const getPageSize = (pageSize) => {
    if (!pageSize || pageSize.width <= 0 || pageSize.height <= 0) {
        throw new Error('Valid canvas dimensions are required');
    }
    return pageSize;
};

export const getStampRenderPlan = (stamp, pageSize) => {
    const { width: pageWidth, height: pageHeight } = getPageSize(pageSize);
    const appearance = normalizeStampAppearance(stamp);
    const x = stamp.xPercent * pageWidth;
    const y = stamp.yPercent * pageHeight;
    const width = stamp.widthPercent * pageWidth;
    const height = stamp.heightPercent * pageHeight;

    return {
        x,
        y,
        width,
        height,
        centerX: x + width / 2,
        centerY: y + height / 2,
        rotationRadians: (stamp.rotation || 0) * DEGREES_TO_RADIANS,
        opacity: appearance.opacity,
        filter: getStampFilter(appearance),
        compositeOperation: getCanvasCompositeOperation(appearance)
    };
};

export const drawStampOnCanvas = ({ context, image, stamp, pageSize }) => {
    const plan = getStampRenderPlan(stamp, pageSize);

    context.save();
    context.globalAlpha = plan.opacity;
    context.filter = plan.filter;
    context.globalCompositeOperation = plan.compositeOperation;
    context.translate(plan.centerX, plan.centerY);
    context.rotate(plan.rotationRadians);
    context.drawImage(
        image,
        -plan.width / 2,
        -plan.height / 2,
        plan.width,
        plan.height
    );
    context.restore();
};

export const loadCanvasImage = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'Anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${url}`));
    image.src = url;
});
