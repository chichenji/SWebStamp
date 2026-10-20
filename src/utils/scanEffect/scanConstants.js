export const SCAN_MODES = Object.freeze({
    PHOTOCOPY: 'photocopy',
    MONOCHROME: 'monochrome',
    COLOR: 'color'
});

export const SCAN_MODE_LABELS = Object.freeze({
    [SCAN_MODES.PHOTOCOPY]: '真实影印',
    [SCAN_MODES.MONOCHROME]: '清晰黑白',
    [SCAN_MODES.COLOR]: '彩色扫描'
});

export const PRESET_PHOTOCOPY = Object.freeze({
    mode: SCAN_MODES.PHOTOCOPY,
    brightness: -2,
    contrast: 22,
    monochromeThreshold: 135,
    paperTexture: 24,
    baseGray: 18,
    grain: 20,
    edgeShadow: 16,
    subtleBlur: 0.4,
    tiltAngle: 0.3,
    preserveStampColors: false,
    fitToA4: false
});

export const PRESET_MONOCHROME = Object.freeze({
    mode: SCAN_MODES.MONOCHROME,
    brightness: 5,
    contrast: 45,
    monochromeThreshold: 140,
    paperTexture: 8,
    baseGray: 2,
    grain: 6,
    edgeShadow: 0,
    subtleBlur: 0,
    tiltAngle: 0,
    preserveStampColors: false,
    fitToA4: false
});

export const PRESET_COLOR = Object.freeze({
    mode: SCAN_MODES.COLOR,
    brightness: 0,
    contrast: 10,
    monochromeThreshold: 128,
    paperTexture: 16,
    baseGray: 8,
    grain: 12,
    edgeShadow: 10,
    subtleBlur: 0.2,
    tiltAngle: 0.2,
    preserveStampColors: false,
    fitToA4: false
});

export const PRESET_MAP = Object.freeze({
    [SCAN_MODES.PHOTOCOPY]: PRESET_PHOTOCOPY,
    [SCAN_MODES.MONOCHROME]: PRESET_MONOCHROME,
    [SCAN_MODES.COLOR]: PRESET_COLOR
});

export const DEFAULT_SCAN_CONFIG = Object.freeze({
    enabled: false,
    scope: 'all',
    compareOriginal: false,
    ...PRESET_PHOTOCOPY
});

const NUMBER_RANGES = Object.freeze({
    brightness: [-100, 100], contrast: [-100, 100], monochromeThreshold: [0, 255],
    paperTexture: [0, 100], baseGray: [0, 100], grain: [0, 100],
    edgeShadow: [0, 100], subtleBlur: [0, 5], tiltAngle: [-5, 5]
});
const normalizeNumber = (key, value) => {
    const [min, max] = NUMBER_RANGES[key];
    if (!Number.isFinite(value)) throw new TypeError(`扫描参数 ${key} 必须是有限数字`);
    return Math.min(max, Math.max(min, value));
};

export const normalizeScanConfig = (raw = {}) => {
    const mode = raw.mode ?? SCAN_MODES.PHOTOCOPY;
    if (!Object.values(SCAN_MODES).includes(mode)) throw new TypeError(`未知扫描模式：${mode}`);
    const merged = { ...DEFAULT_SCAN_CONFIG, ...PRESET_MAP[mode], ...raw, mode };
    if (!['all', 'page'].includes(merged.scope)) throw new TypeError('未知扫描应用范围');
    const numbers = Object.fromEntries(Object.keys(NUMBER_RANGES).map(key => [key, normalizeNumber(key, merged[key])]));
    for (const key of ['enabled', 'compareOriginal', 'preserveStampColors', 'fitToA4']) {
        if (typeof merged[key] !== 'boolean') throw new TypeError(`扫描参数 ${key} 必须是布尔值`);
    }
    return Object.freeze({ ...merged, ...numbers });
};

export const createScanConfig = (overrides = {}) => {
    return normalizeScanConfig(overrides);
};
