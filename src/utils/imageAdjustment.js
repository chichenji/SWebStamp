export const DEFAULT_IMAGE_ADJUSTMENTS = Object.freeze({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    grayscale: 0,
    invert: 0,
    sepia: 0
});

export const IMAGE_ADJUSTMENT_RANGES = Object.freeze({
    brightness: [-100, 100],
    contrast: [-100, 100],
    saturation: [-100, 100],
    grayscale: [0, 100],
    invert: [0, 100],
    sepia: [0, 100]
});

export const IMAGE_ADJUSTMENT_FIELDS = Object.freeze([
    { key: 'brightness', label: '图片亮度', min: -100, max: 100, step: 1, unit: '' },
    { key: 'contrast', label: '图片对比度', min: -100, max: 100, step: 1, unit: '' },
    { key: 'saturation', label: '图片饱和度', min: -100, max: 100, step: 1, unit: '' },
    { key: 'grayscale', label: '图片去色', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'invert', label: '图片反相', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'sepia', label: '图片复古色调', min: 0, max: 100, step: 1, unit: '%' }
]);

const normalizeAdjustmentField = (key, value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new TypeError(`图片调整参数 ${key} 必须是有限数字`);
    }
    const [min, max] = IMAGE_ADJUSTMENT_RANGES[key];
    if (value < min || value > max) {
        throw new RangeError(`图片调整参数 ${key} 超出有效范围 [${min}, ${max}]`);
    }
    return value;
};

const assertValidScope = scope => {
    if (scope !== 'page' && scope !== 'all') {
        throw new TypeError(`未知图片调整范围：${scope}`);
    }
};

export const normalizeImageAdjustments = (raw = {}) => {
    if (raw === null || raw === undefined) {
        return DEFAULT_IMAGE_ADJUSTMENTS;
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) {
        throw new TypeError('图片调整配置必须是对象');
    }
    const normalized = {};
    for (const key of Object.keys(IMAGE_ADJUSTMENT_RANGES)) {
        const value = raw[key] === undefined ? DEFAULT_IMAGE_ADJUSTMENTS[key] : raw[key];
        normalized[key] = normalizeAdjustmentField(key, value);
    }
    return Object.freeze(normalized);
};

export const isIdentityAdjustments = (adjustments) => {
    const normalized = normalizeImageAdjustments(adjustments);
    return (
        normalized.brightness === 0 &&
        normalized.contrast === 0 &&
        normalized.saturation === 0 &&
        normalized.grayscale === 0 &&
        normalized.invert === 0 &&
        normalized.sepia === 0
    );
};

export const getImageFilter = (adjustments) => {
    const normalized = normalizeImageAdjustments(adjustments);
    if (isIdentityAdjustments(normalized)) {
        return 'none';
    }
    const b = Math.round(100 + normalized.brightness);
    const c = Math.round(100 + normalized.contrast);
    const s = Math.round(100 + normalized.saturation);
    const g = Math.round(normalized.grayscale);
    const i = Math.round(normalized.invert);
    const sep = Math.round(normalized.sepia);
    return `brightness(${b}%) contrast(${c}%) saturate(${s}%) grayscale(${g}%) invert(${i}%) sepia(${sep}%)`;
};

export const getImageAdjustments = (doc) => {
    if (doc === null || doc === undefined) return DEFAULT_IMAGE_ADJUSTMENTS;
    if (typeof doc !== 'object' || Array.isArray(doc)) {
        throw new TypeError('图片调整配置必须是对象');
    }
    if (doc.imageAdjustments === null || doc.imageAdjustments === undefined) {
        return DEFAULT_IMAGE_ADJUSTMENTS;
    }
    return normalizeImageAdjustments(doc.imageAdjustments);
};

export const drawBaseImageOnCanvas = ({ context, image, width, height, imageAdjustments }) => {
    const filter = getImageFilter(imageAdjustments);
    if (filter !== 'none') {
        context.save();
        context.filter = filter;
        context.drawImage(image, 0, 0, width, height);
        context.restore();
    } else {
        context.drawImage(image, 0, 0, width, height);
    }
};

export const applyImageAdjustmentsToDocuments = ({ documents = [], targetId, scope = 'page', updates = {} }) => {
    assertValidScope(scope);
    if (!documents.length) return [];
    if (scope === 'all') {
        return documents.map(doc => {
            const current = getImageAdjustments(doc);
            const next = normalizeImageAdjustments({ ...current, ...updates });
            return { ...doc, imageAdjustments: next };
        });
    }
    return documents.map(doc => {
        if (doc.id !== targetId) return doc;
        const current = getImageAdjustments(doc);
        const next = normalizeImageAdjustments({ ...current, ...updates });
        return { ...doc, imageAdjustments: next };
    });
};

export const resetDocumentsImageAdjustments = ({ documents = [], targetId, scope = 'page' }) => {
    assertValidScope(scope);
    if (!documents.length) return [];
    if (scope === 'all') {
        return documents.map(doc => ({ ...doc, imageAdjustments: DEFAULT_IMAGE_ADJUSTMENTS }));
    }
    return documents.map(doc => (
        doc.id === targetId
            ? { ...doc, imageAdjustments: DEFAULT_IMAGE_ADJUSTMENTS }
            : doc
    ));
};
