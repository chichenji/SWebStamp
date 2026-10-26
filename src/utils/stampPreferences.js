import { DEFAULT_STAMP_APPEARANCE } from './stampAppearance.js';
import { readStorageItem, writeStorageItem } from './preferenceStorage.js';

export const STAMP_PREFERENCES_KEY = 'webpdf_stamp_preferences_v1';
export const STAMP_PREFERENCES_VERSION = 1;
export const MIN_STAMP_WIDTH = 0.05;
export const MAX_STAMP_WIDTH = 0.8;
export const DEFAULT_STAMP_WIDTH = 0.18;

export const DEFAULT_STAMP_PREFERENCES = Object.freeze({
    widthPercent: DEFAULT_STAMP_WIDTH,
    rotation: 0,
    ...DEFAULT_STAMP_APPEARANCE
});

const validateOptionalRange = (name, val, { min, max, fallback }) => {
    if (val === undefined) return fallback;
    if (typeof val !== 'number' || !Number.isFinite(val) || val < min || val > max) {
        throw new Error(`${name}无效或超出有效范围(${min}-${max})`);
    }
    return val;
};

const validateOptionalRotation = (val, fallback) => {
    if (val === undefined) return fallback;
    if (typeof val !== 'number' || !Number.isFinite(val)) {
        throw new Error('印章旋转角度必须为有限数值');
    }
    return val;
};

const validateOptionalBlendMode = (val, fallback) => {
    if (val === undefined) return fallback;
    if (val !== 'multiply' && val !== 'normal') {
        throw new Error('印章混合模式不支持');
    }
    return val;
};

export const extractStampPreferences = (source = {}, base = DEFAULT_STAMP_PREFERENCES) => ({
    widthPercent: validateOptionalRange('印章宽度比例', source.widthPercent, {
        min: MIN_STAMP_WIDTH, max: MAX_STAMP_WIDTH, fallback: base.widthPercent
    }),
    rotation: validateOptionalRotation(source.rotation, base.rotation),
    opacity: validateOptionalRange('印章透明度', source.opacity, {
        min: 0.1, max: 1, fallback: base.opacity
    }),
    brightness: validateOptionalRange('印章亮度', source.brightness, {
        min: 0.5, max: 1.5, fallback: base.brightness
    }),
    contrast: validateOptionalRange('印章对比度', source.contrast, {
        min: 0.5, max: 2, fallback: base.contrast
    }),
    saturation: validateOptionalRange('印章饱和度', source.saturation, {
        min: 0, max: 2, fallback: base.saturation
    }),
    blendMode: validateOptionalBlendMode(source.blendMode, base.blendMode)
});

const REQUIRED_STAMP_KEYS = Object.freeze([
    'widthPercent', 'rotation', 'opacity', 'brightness',
    'contrast', 'saturation', 'blendMode'
]);

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const findMissingStampKey = (settings) => {
    for (const key of REQUIRED_STAMP_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(settings, key) || settings[key] === undefined) {
            return key;
        }
    }
    return null;
};

const validateStampPayloadStructure = (parsed) => {
    if (!isPlainObject(parsed)) {
        return '印章偏好数据格式错误（非对象）';
    }
    if (parsed.version !== STAMP_PREFERENCES_VERSION) {
        return `不支持的版本: ${parsed.version}`;
    }
    if (!isPlainObject(parsed.settings)) {
        return '印章设置字段缺失或格式错误';
    }
    const missingKey = findMissingStampKey(parsed.settings);
    return missingKey ? `印章设置缺少必填字段: ${missingKey}` : null;
};

export const validateStampPreferencesSchema = (parsed) => {
    const structureError = validateStampPayloadStructure(parsed);
    if (structureError) {
        return { valid: false, error: structureError };
    }
    try {
        const settings = extractStampPreferences(parsed.settings, parsed.settings);
        return { valid: true, settings };
    } catch (error) {
        return { valid: false, error: error.message };
    }
};

export const loadStampPreferences = (storage) => {
    const result = readStorageItem(STAMP_PREFERENCES_KEY, storage);
    if (!result.ok) {
        return { status: 'error', error: result.error, preferences: DEFAULT_STAMP_PREFERENCES, corruptRaw: null };
    }
    if (result.raw === null || result.raw === undefined) {
        return { status: 'idle', error: null, preferences: DEFAULT_STAMP_PREFERENCES, corruptRaw: null };
    }
    try {
        const parsed = JSON.parse(result.raw);
        const validation = validateStampPreferencesSchema(parsed);
        if (!validation.valid) {
            return { status: 'corrupt', error: validation.error, preferences: DEFAULT_STAMP_PREFERENCES, corruptRaw: result.raw };
        }
        return { status: 'idle', error: null, preferences: validation.settings, corruptRaw: null };
    } catch {
        return { status: 'corrupt', error: '印章设置数据解析失败（JSON 损坏）', preferences: DEFAULT_STAMP_PREFERENCES, corruptRaw: result.raw };
    }
};

export const saveStampPreferencesToStorage = (preferences, storage) => {
    const cleanSettings = extractStampPreferences(preferences);
    const payload = JSON.stringify({
        version: STAMP_PREFERENCES_VERSION,
        settings: cleanSettings
    });
    return writeStorageItem(STAMP_PREFERENCES_KEY, payload, storage);
};
