import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_STAMP_APPEARANCE,
    REALISTIC_STAMP_PRESET,
    getCanvasCompositeOperation,
    getStampFilter,
    normalizeStampAppearance
} from './stampAppearance.js';

test('normalizes stamp appearance and clamps user-controlled values', () => {
    const appearance = normalizeStampAppearance({
        opacity: 3,
        brightness: 0.1,
        contrast: 4,
        saturation: -1,
        blendMode: 'unsupported'
    });

    assert.deepEqual(appearance, {
        ...DEFAULT_STAMP_APPEARANCE,
        opacity: 1,
        brightness: 0.5,
        contrast: 2,
        saturation: 0,
        blendMode: 'multiply'
    });
});

test('maps appearance settings to the same preview and canvas semantics', () => {
    assert.equal(
        getStampFilter(REALISTIC_STAMP_PRESET),
        'brightness(90%) contrast(125%) saturate(120%)'
    );
    assert.equal(getCanvasCompositeOperation(REALISTIC_STAMP_PRESET), 'multiply');
    assert.equal(getCanvasCompositeOperation({ blendMode: 'normal' }), 'source-over');
});
