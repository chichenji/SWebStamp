import { resolveWatermarkConfig } from './watermarkConfig.js';

const PERCENT = 100;
const DEG_TO_RAD = Math.PI / 180;
const BASE_GAP_X = 80;
const BASE_GAP_Y = 80;

const isPositiveDimension = dim => (
    Boolean(dim) &&
    Number.isFinite(dim.width) &&
    Number.isFinite(dim.height) &&
    dim.width > 0 &&
    dim.height > 0
);

const assertGridDimensions = (pageSize, imageSize) => {
    if (!isPositiveDimension(pageSize)) {
        throw new Error('Invalid page dimensions for watermark array grid');
    }
    if (!isPositiveDimension(imageSize)) {
        throw new Error('Invalid image dimensions for watermark array grid');
    }
};

const assertGridScalars = (density, angle) => {
    if (typeof density !== 'number' || !Number.isFinite(density) || density <= 0) {
        throw new Error(`Watermark density must be a positive finite number, got: ${density}`);
    }
    if (typeof angle !== 'number' || !Number.isFinite(angle)) {
        throw new Error(`Watermark angle must be a finite number, got: ${angle}`);
    }
};

export const calculateArrayGrid = options => {
    const { pageSize, imageSize, density } = options;
    const angle = options.angle === undefined ? 0 : options.angle;
    assertGridDimensions(pageSize, imageSize);
    assertGridScalars(density, angle);

    const gapX = BASE_GAP_X * density;
    const gapY = BASE_GAP_Y * density;
    const stepX = imageSize.width + gapX;
    const stepY = imageSize.height + gapY;

    const radians = angle * DEG_TO_RAD;
    const cosine = Math.abs(Math.cos(radians));
    const sine = Math.abs(Math.sin(radians));
    const boundX = (pageSize.width / 2) * cosine + (pageSize.height / 2) * sine;
    const boundY = (pageSize.width / 2) * sine + (pageSize.height / 2) * cosine;

    const maxCols = Math.ceil((boundX + imageSize.width / 2) / stepX) + 1;
    const maxRows = Math.ceil((boundY + imageSize.height / 2) / stepY) + 1;

    return { stepX, stepY, maxCols, maxRows, boundX, boundY, gapX, gapY };
};

const drawSingleWatermark = ({ context, pageSize, image, config }) => {
    const x = (pageSize.width * config.positionX) / PERCENT;
    const y = (pageSize.height * config.positionY) / PERCENT;
    context.translate(x, y);
    context.rotate(config.angle * DEG_TO_RAD);
    context.drawImage(image, -image.width / 2, -image.height / 2);
};

const drawArrayWatermark = ({ context, pageSize, image, config }) => {
    const grid = calculateArrayGrid({
        pageSize,
        imageSize: image,
        density: config.density,
        angle: config.angle
    });
    const centerX = pageSize.width / 2;
    const centerY = pageSize.height / 2;
    context.translate(centerX, centerY);
    context.rotate(config.angle * DEG_TO_RAD);

    for (let row = -grid.maxRows; row <= grid.maxRows; row++) {
        const y = row * grid.stepY;
        for (let col = -grid.maxCols; col <= grid.maxCols; col++) {
            const x = col * grid.stepX;
            context.drawImage(image, x - image.width / 2, y - image.height / 2);
        }
    }
};

const isValidContext = context => (
    Boolean(context) &&
    typeof context.save === 'function' &&
    typeof context.restore === 'function'
);

const assertDrawInputs = (context, pageSize, image) => {
    if (!isValidContext(context)) {
        throw new Error('Valid canvas 2D context is required to draw page watermark');
    }
    if (!isPositiveDimension(pageSize)) {
        throw new Error('Invalid page dimensions for watermark');
    }
    if (!isPositiveDimension(image)) {
        throw new Error('Invalid watermark image dimensions');
    }
};

export const drawPageWatermark = ({ context, pageSize, asset }) => {
    if (!asset || !asset.image) return;
    assertDrawInputs(context, pageSize, asset.image);

    const config = resolveWatermarkConfig(asset.config);
    context.save();
    if (config.layout === 'single') {
        drawSingleWatermark({ context, pageSize, image: asset.image, config });
    } else {
        drawArrayWatermark({ context, pageSize, image: asset.image, config });
    }
    context.restore();
};
