export const DEFAULT_WATERMARK = Object.freeze({
    type: 'text',
    text: '在此输入水印内容',
    imageUrl: null,
    layout: 'array',
    opacity: 0.15,
    angle: -45,
    density: 1.5,
    color: '#888888',
    fontSize: 36,
    positionX: 50,
    positionY: 50
});

const assertFinite = (name, value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`Watermark ${name} must be a finite number, got: ${value}`);
    }
};

const assertPositive = (name, value) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error(`Watermark ${name} must be a positive finite number, got: ${value}`);
    }
};

const assertRange = (name, value, [min, max]) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
        throw new Error(`Watermark ${name} must be a number between ${min} and ${max}, got: ${value}`);
    }
};

const assertSupported = (name, value, allowed) => {
    if (!allowed.includes(value)) {
        throw new Error(`Unsupported watermark ${name}: ${value}`);
    }
};

export const resolveWatermarkConfig = config => {
    const resolved = { ...DEFAULT_WATERMARK, ...config };
    assertSupported('type', resolved.type, ['text', 'image']);
    assertSupported('layout', resolved.layout, ['array', 'single']);
    assertPositive('density', resolved.density);
    assertFinite('angle', resolved.angle);
    assertPositive('fontSize', resolved.fontSize);
    assertRange('opacity', resolved.opacity, [0, 1]);
    assertFinite('positionX', resolved.positionX);
    assertFinite('positionY', resolved.positionY);
    return resolved;
};
