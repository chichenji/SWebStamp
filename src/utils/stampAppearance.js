export const DEFAULT_STAMP_APPEARANCE = Object.freeze({
    opacity: 0.88,
    brightness: 0.9,
    contrast: 1.25,
    saturation: 1.2,
    blendMode: 'multiply'
});

export const REALISTIC_STAMP_PRESET = Object.freeze({
    ...DEFAULT_STAMP_APPEARANCE
});

const APPEARANCE_LIMITS = Object.freeze({
    opacity: [0.1, 1],
    brightness: [0.5, 1.5],
    contrast: [0.5, 2],
    saturation: [0, 2]
});

const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value));

const normalizeNumber = (value, fallback, limits) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? clamp(parsed, limits) : fallback;
};

export const normalizeStampAppearance = (appearance = {}) => ({
    opacity: normalizeNumber(
        appearance.opacity,
        DEFAULT_STAMP_APPEARANCE.opacity,
        APPEARANCE_LIMITS.opacity
    ),
    brightness: normalizeNumber(
        appearance.brightness,
        DEFAULT_STAMP_APPEARANCE.brightness,
        APPEARANCE_LIMITS.brightness
    ),
    contrast: normalizeNumber(
        appearance.contrast,
        DEFAULT_STAMP_APPEARANCE.contrast,
        APPEARANCE_LIMITS.contrast
    ),
    saturation: normalizeNumber(
        appearance.saturation,
        DEFAULT_STAMP_APPEARANCE.saturation,
        APPEARANCE_LIMITS.saturation
    ),
    blendMode: appearance.blendMode === 'normal' ? 'normal' : 'multiply'
});

export const getStampFilter = (appearance = {}) => {
    const normalized = normalizeStampAppearance(appearance);
    const brightness = Math.round(normalized.brightness * 100);
    const contrast = Math.round(normalized.contrast * 100);
    const saturation = Math.round(normalized.saturation * 100);
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
};

export const getCanvasCompositeOperation = (appearance = {}) => (
    normalizeStampAppearance(appearance).blendMode === 'multiply'
        ? 'multiply'
        : 'source-over'
);
