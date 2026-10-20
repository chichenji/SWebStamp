import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScanConfig, normalizeScanConfig, SCAN_MODES, PRESET_MAP } from './scanEffect/scanConstants.js';
import { createSeedFromId, generatePixelNoise, compositeAlphaOntoWhite } from './scanEffect/scanNoise.js';
import { applyTonalConversion, applyScanOptics, processScanPixels,
    processTonalOnly, processOpticsOnly, applySubtleBlur } from './scanEffect/scanPixelProcessing.js';
import { calculateScanGeometry, mapPointerToSource, mapTargetToPointer,
    getRotatedBoundingBox, mapDeltaToSource } from './scanEffect/scanGeometry.js';

const gray = value => ({ r: value, g: value, b: value, a: 255 });
const pixelOptions = overrides => ({ data: new Uint8ClampedArray([230, 20, 20, 255]),
    width: 1, height: 1, seed: 999, config: createScanConfig({ enabled: true, subtleBlur: 0 }), ...overrides });

test('scan is disabled by default and each mode uses its own preset', () => {
    assert.equal(createScanConfig().enabled, false);
    for (const mode of Object.values(SCAN_MODES)) {
        const config = createScanConfig({ mode });
        assert.equal(config.contrast, PRESET_MAP[mode].contrast);
        assert.equal(config.mode, mode);
        assert.ok(Object.isFrozen(config));
    }
});

test('scan validates explicit invalid inputs rather than silently substituting defaults', () => {
    assert.throws(() => normalizeScanConfig({ mode: 'bad' }), /未知扫描模式/);
    assert.throws(() => normalizeScanConfig({ brightness: NaN }), /有限数字/);
    assert.throws(() => normalizeScanConfig({ contrast: Infinity }), /有限数字/);
    assert.throws(() => normalizeScanConfig({ enabled: 'false' }), /布尔值/);
    assert.throws(() => normalizeScanConfig({ scope: 'bad' }), /应用范围/);
    assert.equal(normalizeScanConfig({ brightness: 200 }).brightness, 100);
    assert.equal(normalizeScanConfig({ monochromeThreshold: 0 }).monochromeThreshold, 0);
});

test('paper texture is deterministic, page-specific, and resolution independent', () => {
    const seed = createSeedFromId('page-1');
    assert.equal(seed, createSeedFromId('page-1'));
    assert.notEqual(seed, createSeedFromId('page-2'));
    const noise = generatePixelNoise({ x: 51, y: 103, width: 200, height: 300, seed });
    assert.deepEqual(noise, generatePixelNoise({ x: 102, y: 206, width: 400, height: 600, seed }));
    assert.notDeepEqual(noise, generatePixelNoise({ x: 51, y: 103, width: 200, height: 300, seed: seed + 1 }));
    assert.ok(Object.values(noise).every(Number.isFinite));
    assert.throws(() => createSeedFromId(null), /稳定 ID/);
});

test('transparent areas composite onto white for scanning', () => {
    assert.deepEqual(compositeAlphaOntoWhite({ r: 20, g: 40, b: 60, a: 0 }), gray(255));
    assert.equal(compositeAlphaOntoWhite({ r: 0, g: 0, b: 0, a: 128 }).r, 127);
});

test('photocopy keeps black text and pale anti-aliased table lines', () => {
    const config = createScanConfig({ enabled: true });
    assert.ok(applyTonalConversion(gray(20), config).r < 30);
    for (const line of [204, 215, 229, 240, 248]) {
        const processed = applyTonalConversion(gray(line), config);
        assert.ok(processed.r < 253, `line ${line} should retain contrast`);
        assert.equal(processed.r, processed.g);
        assert.equal(processed.g, processed.b);
    }
});

test('brightness and contrast both work in every scan mode', () => {
    for (const mode of Object.values(SCAN_MODES)) {
        const dark = createScanConfig({ mode, brightness: -50, monochromeThreshold: 80 });
        const light = createScanConfig({ ...dark, brightness: 50 });
        assert.ok(applyTonalConversion(gray(180), dark).r < applyTonalConversion(gray(180), light).r, mode);
        const flat = createScanConfig({ mode, contrast: -50, monochromeThreshold: 80 });
        const deep = createScanConfig({ ...flat, contrast: 50 });
        assert.notEqual(applyTonalConversion(gray(180), flat).r, applyTonalConversion(gray(180), deep).r);
    }
});

test('black-white threshold accepts zero and adjusts the ink cutoff', () => {
    const low = createScanConfig({ mode: 'monochrome', brightness: 0, contrast: 0, monochromeThreshold: 0 });
    const high = createScanConfig({ ...low, monochromeThreshold: 200 });
    assert.ok(applyTonalConversion(gray(100), low).r > applyTonalConversion(gray(100), high).r);
});

test('color mode preserves color and paper optics adds neutral texture', () => {
    const config = createScanConfig({ mode: 'color' });
    const pixel = applyTonalConversion({ r: 230, g: 20, b: 20, a: 255 }, config);
    assert.ok(pixel.r > pixel.g + 100);
    const paper = applyScanOptics({ pixel: gray(255), noise: { grain: -0.2, fiber: 0.5, edge: 0.8 }, config });
    assert.ok(paper.r < 255 && Number.isFinite(paper.r));
    assert.equal(paper.r, paper.g);
});

test('tonal and optics stages return new buffers without changing input', () => {
    const options = pixelOptions();
    const before = new Uint8ClampedArray(options.data);
    const toned = processTonalOnly(options);
    const optics = processOpticsOnly(options);
    const combined = processScanPixels(options);
    assert.deepEqual(options.data, before);
    assert.equal(toned[0], toned[1]);
    assert.ok(optics[0] > optics[1] + 100);
    assert.equal(combined[0], combined[1]);
    assert.deepEqual(combined, processScanPixels(options));
    assert.throws(() => processScanPixels({ ...options, width: 2 }), /尺寸不匹配/);
});

test('fractional blur is continuous and does not mutate source pixels', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    const small = applySubtleBlur({ data, width: 2, height: 1, radius: 0.4 });
    const large = applySubtleBlur({ data, width: 2, height: 1, radius: 1 });
    assert.equal(data[0], 0);
    assert.ok(small[0] > 0 && small[0] < large[0]);
    assert.equal(small[3], 255);
});

test('geometry is identity when disabled and rejects invalid source dimensions', () => {
    const geometry = calculateScanGeometry({ sourceWidth: 800, sourceHeight: 1200 });
    assert.equal(geometry.scale, 1);
    assert.equal(geometry.targetHeight, 1200);
    assert.throws(() => calculateScanGeometry({ sourceWidth: 0, sourceHeight: 800 }), /正数/);
    assert.throws(() => calculateScanGeometry({ sourceWidth: 800, sourceHeight: 800, tiltAngle: NaN }), /有限数字/);
});

test('portrait and landscape A4 fit without cropping or stretching', () => {
    for (const dimensions of [[800, 1000], [1000, 800], [1000, 1000]]) {
        const geometry = calculateScanGeometry({ sourceWidth: dimensions[0], sourceHeight: dimensions[1], fitToA4: true, tiltAngle: 3 });
        const ratio = dimensions[0] >= dimensions[1] ? 297 / 210 : 210 / 297;
        assert.ok(Math.abs(geometry.targetWidth / geometry.targetHeight - ratio) < 0.001);
        assert.equal(geometry.contentWidth / geometry.contentHeight, dimensions[0] / dimensions[1]);
        const box = getRotatedBoundingBox({ width: geometry.contentWidth, height: geometry.contentHeight, angleDegrees: 3 });
        assert.ok(box.width <= geometry.targetWidth + 0.01);
        assert.ok(box.height <= geometry.targetHeight + 0.01);
    }
});

test('pointer and movement mapping remain correct on rotated A4 paper', () => {
    const geometry = calculateScanGeometry({ sourceWidth: 800, sourceHeight: 1100, fitToA4: true, tiltAngle: 2.5 });
    const target = mapTargetToPointer({ sourceXPercent: 0.35, sourceYPercent: 0.65, geometry });
    const source = mapPointerToSource({ targetX: target.x, targetY: target.y, geometry });
    assert.ok(Math.abs(source.xPercent - 0.35) < 1e-10);
    assert.ok(Math.abs(source.yPercent - 0.65) < 1e-10);
    const delta = mapDeltaToSource({ deltaX: 80, deltaY: 30, geometry });
    assert.ok(Number.isFinite(delta.deltaXPercent));
    assert.notEqual(delta.deltaYPercent, 30 / geometry.sourceHeight);
});
