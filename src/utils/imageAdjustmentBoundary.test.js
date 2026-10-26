import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_IMAGE_ADJUSTMENTS,
    getImageFilter,
    getImageAdjustments,
    isIdentityAdjustments
} from './imageAdjustment.js';

test('image adjustment functions accept missing and null configuration as identity', () => {
    assert.equal(isIdentityAdjustments(), true);
    assert.equal(isIdentityAdjustments(undefined), true);
    assert.equal(isIdentityAdjustments(null), true);
    assert.equal(isIdentityAdjustments(DEFAULT_IMAGE_ADJUSTMENTS), true);

    assert.equal(getImageFilter(), 'none');
    assert.equal(getImageFilter(undefined), 'none');
    assert.equal(getImageFilter(null), 'none');
    assert.equal(getImageFilter(DEFAULT_IMAGE_ADJUSTMENTS), 'none');

    assert.deepEqual(getImageAdjustments(), DEFAULT_IMAGE_ADJUSTMENTS);
    assert.deepEqual(getImageAdjustments(undefined), DEFAULT_IMAGE_ADJUSTMENTS);
    assert.deepEqual(getImageAdjustments(null), DEFAULT_IMAGE_ADJUSTMENTS);
    assert.deepEqual(getImageAdjustments({}), DEFAULT_IMAGE_ADJUSTMENTS);
    assert.deepEqual(getImageAdjustments({ imageAdjustments: null }), DEFAULT_IMAGE_ADJUSTMENTS);
    assert.deepEqual(getImageAdjustments({ imageAdjustments: undefined }), DEFAULT_IMAGE_ADJUSTMENTS);
});

test('image adjustment functions throw on explicit false, 0, and empty string', () => {
    const invalidPrimitives = [false, 0, '', NaN];

    for (const val of invalidPrimitives) {
        assert.throws(() => getImageFilter(val), /图片调整配置必须是对象/);
        assert.throws(() => isIdentityAdjustments(val), /图片调整配置必须是对象/);
        assert.throws(() => getImageAdjustments(val), /图片调整配置必须是对象/);
        assert.throws(() => getImageAdjustments({ imageAdjustments: val }), /图片调整配置必须是对象/);
    }
});
