import { DEFAULT_WATERMARK } from './watermarkConfig.js';
import { readStorageItem, writeStorageItem } from './preferenceStorage.js';

export const WATERMARK_PREFERENCES_KEY = 'webpdf_watermark_preferences_v1';
export const WATERMARK_PREFERENCES_VERSION = 1;

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DATA_URL_REGEX = /^data:image\/[a-zA-Z0-9+.-]+;base64,/;

const validateWatermarkPayloadStructure = (parsed) => {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return '水印偏好数据格式错误（非对象）';
    }
    if (parsed.version !== WATERMARK_PREFERENCES_VERSION) {
        return `不支持的水印偏好版本: ${parsed.version}`;
    }
    if (typeof parsed.enabled !== 'boolean') {
        return '水印启用状态缺失或类型错误';
    }
    if (!parsed.config || typeof parsed.config !== 'object' || Array.isArray(parsed.config)) {
        return '水印配置缺失或格式错误';
    }
    return null;
};

const assertFinite = (name, val) => {
    if (typeof val !== 'number' || !Number.isFinite(val)) {
        throw new Error(`水印 ${name} 必须为有效数值`);
    }
};

const assertPositive = (name, val) => {
    if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) {
        throw new Error(`水印 ${name} 必须为大于 0 的数值`);
    }
};

const validateNumericFields = (config) => {
    if (typeof config.opacity !== 'number' || !Number.isFinite(config.opacity) || config.opacity < 0 || config.opacity > 1) {
        throw new Error('水印透明度必须在 0 到 1 之间');
    }
    assertFinite('angle', config.angle);
    assertPositive('density', config.density);
    assertPositive('fontSize', config.fontSize);
    assertFinite('positionX', config.positionX);
    assertFinite('positionY', config.positionY);
};

const validateWatermarkBasics = (config) => {
    if (config.type !== 'text' && config.type !== 'image') {
        return '水印类型必须为 text 或 image';
    }
    if (typeof config.text !== 'string') {
        return '水印文本必须为字符串';
    }
    if (config.imageUrl !== null && (typeof config.imageUrl !== 'string' || !DATA_URL_REGEX.test(config.imageUrl))) {
        return '水印图片地址必须为本地有效图片 DataURL 或 null';
    }
    return null;
};

const validateWatermarkStyle = (config) => {
    if (config.layout !== 'array' && config.layout !== 'single') {
        return '水印布局必须为 array 或 single';
    }
    if (typeof config.color !== 'string' || !HEX_COLOR_REGEX.test(config.color)) {
        return '水印颜色必须为有效十六进制颜色代码';
    }
    return null;
};

export const validateWatermarkConfig = (config) => {
    if (!config || typeof config !== 'object') {
        return '水印配置必须为对象';
    }
    const basicError = validateWatermarkBasics(config);
    if (basicError) return basicError;
    const styleError = validateWatermarkStyle(config);
    if (styleError) return styleError;
    try {
        validateNumericFields(config);
        return null;
    } catch (err) {
        return err.message;
    }
};

export const cleanWatermarkConfig = (config) => {
    const error = validateWatermarkConfig(config);
    if (error) {
        throw new Error(error);
    }
    return {
        type: config.type,
        text: config.text,
        imageUrl: config.imageUrl,
        layout: config.layout,
        opacity: config.opacity,
        angle: config.angle,
        density: config.density,
        color: config.color,
        fontSize: config.fontSize,
        positionX: config.positionX,
        positionY: config.positionY
    };
};

export const validateWatermarkPreferencesSchema = (parsed) => {
    const structureError = validateWatermarkPayloadStructure(parsed);
    if (structureError) {
        return { valid: false, error: structureError };
    }
    const fieldsError = validateWatermarkConfig(parsed.config);
    if (fieldsError) {
        return { valid: false, error: fieldsError };
    }
    return {
        valid: true,
        enabled: parsed.enabled,
        config: cleanWatermarkConfig(parsed.config)
    };
};

export const loadWatermarkPreferences = (storage) => {
    const result = readStorageItem(WATERMARK_PREFERENCES_KEY, storage);
    if (!result.ok) {
        return { status: 'error', error: result.error, enabled: false, config: DEFAULT_WATERMARK, corruptRaw: null };
    }
    if (result.raw === null || result.raw === undefined) {
        return { status: 'idle', error: null, enabled: false, config: DEFAULT_WATERMARK, corruptRaw: null };
    }
    try {
        const parsed = JSON.parse(result.raw);
        const validation = validateWatermarkPreferencesSchema(parsed);
        if (!validation.valid) {
            return { status: 'corrupt', error: validation.error, enabled: false, config: DEFAULT_WATERMARK, corruptRaw: result.raw };
        }
        return { status: 'idle', error: null, enabled: validation.enabled, config: validation.config, corruptRaw: null };
    } catch {
        return { status: 'corrupt', error: '水印设置数据解析失败（JSON 损坏）', enabled: false, config: DEFAULT_WATERMARK, corruptRaw: result.raw };
    }
};

export const saveWatermarkPreferencesToStorage = ({ enabled, config }, storage) => {
    if (typeof enabled !== 'boolean') {
        return { ok: false, error: '水印启用状态必须为布尔值' };
    }
    const fieldsError = validateWatermarkConfig(config);
    if (fieldsError) {
        return { ok: false, error: fieldsError };
    }
    const cleaned = cleanWatermarkConfig(config);
    const payload = JSON.stringify({
        version: WATERMARK_PREFERENCES_VERSION,
        enabled,
        config: cleaned
    });
    return writeStorageItem(WATERMARK_PREFERENCES_KEY, payload, storage);
};
