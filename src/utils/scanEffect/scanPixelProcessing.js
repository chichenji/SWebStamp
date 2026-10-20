import { SCAN_MODES } from './scanConstants.js';
import { compositeAlphaOntoWhite, generatePixelNoise } from './scanNoise.js';
import { applySubtleBlur } from './scanBlur.js';
export { applySubtleBlur } from './scanBlur.js';

const BYTE_MAX = 255;
const LUMA = Object.freeze({ r: 0.299, g: 0.587, b: 0.114 });
const OPTICS = Object.freeze({ gray: 0.22, fiber: 0.1, grain: 0.16, edge: 0.35 });
const MONO_DARK_FACTOR = 0.15;
const MONO_LIGHT_FACTOR = 0.9;
const clampByte = value => Math.min(BYTE_MAX, Math.max(0, Math.round(value)));

const adjustTone = (value, config) => {
    // Anchor paper white while retaining pale anti-aliased table strokes.
    const exponent = 2 ** (config.contrast / 100);
    return clampByte(BYTE_MAX * (value / BYTE_MAX) ** exponent + config.brightness);
};

export const applyTonalConversion = (pixel, config) => {
    const color = compositeAlphaOntoWhite(pixel);
    if (config.mode === SCAN_MODES.COLOR) return {
        r: adjustTone(color.r, config), g: adjustTone(color.g, config),
        b: adjustTone(color.b, config), a: BYTE_MAX
    };
    const luma = color.r * LUMA.r + color.g * LUMA.g + color.b * LUMA.b;
    const adjusted = adjustTone(luma, config);
    const mono = adjusted < config.monochromeThreshold
        ? adjusted * MONO_DARK_FACTOR : BYTE_MAX - (BYTE_MAX - adjusted) * MONO_LIGHT_FACTOR;
    const tone = config.mode === SCAN_MODES.MONOCHROME ? clampByte(mono) : adjusted;
    return { r: tone, g: tone, b: tone, a: BYTE_MAX };
};

export const applyScanOptics = ({ pixel, noise, config }) => {
    const shift = -config.baseGray * OPTICS.gray + noise.fiber * config.paperTexture * OPTICS.fiber
        + noise.grain * config.grain * OPTICS.grain - noise.edge * config.edgeShadow * OPTICS.edge;
    return { r: clampByte(pixel.r + shift), g: clampByte(pixel.g + shift),
        b: clampByte(pixel.b + shift), a: BYTE_MAX };
};

const transformPixels = ({ data, width, height, transform }) => {
    if (data.length !== width * height * 4) throw new TypeError('扫描像素尺寸不匹配');
    const result = new Uint8ClampedArray(data.length);
    for (let offset = 0; offset < data.length; offset += 4) {
        const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2], a: data[offset + 3] };
        const output = transform(pixel, offset / 4);
        result.set([output.r, output.g, output.b, output.a], offset);
    }
    return result;
};

export const processTonalOnly = options => transformPixels({ ...options,
    transform: pixel => applyTonalConversion(pixel, options.config)
});

export const processOpticsOnly = options => {
    const { width, height, config, seed } = options;
    return transformPixels({ ...options, transform: (pixel, index) => applyScanOptics({ pixel, config,
        noise: generatePixelNoise({ x: index % width, y: Math.floor(index / width), width, height, seed })
    }) });
};

export const processScanPixels = options => {
    const toned = processTonalOnly(options);
    const optics = processOpticsOnly({ ...options, data: toned });
    return applySubtleBlur({ ...options, data: optics, radius: options.config.subtleBlur });
};
