import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStampPlacement, createPlacedStamp } from './stampPlacement.js';

const PAGE_RECT = Object.freeze({ left: 100, top: 50, width: 600, height: 800 });

test('centers a dropped stamp at the pointer using page-relative coordinates', () => {
    const placement = calculateStampPlacement({
        clientX: 400,
        clientY: 450,
        pageRect: PAGE_RECT,
        aspectRatio: 2
    });

    assert.equal(placement.widthPercent, 0.18);
    assert.equal(placement.heightPercent, 0.0675);
    assert.equal(placement.xPercent, 0.41);
    assert.equal(placement.yPercent, 0.46625);
});

test('keeps a dropped stamp fully inside the page near an edge', () => {
    const placement = calculateStampPlacement({
        clientX: 705,
        clientY: 855,
        pageRect: PAGE_RECT,
        aspectRatio: 1
    });

    assert.equal(placement.xPercent, 0.82);
    assert.equal(placement.yPercent, 0.865);
});

test('rejects invalid page geometry', () => {
    assert.throws(
        () => calculateStampPlacement({
            clientX: 100,
            clientY: 100,
            pageRect: { left: 0, top: 0, width: 0, height: 800 },
            aspectRatio: 1
        }),
        /page dimensions/i
    );
});

test('creates a placed stamp with realistic appearance defaults', () => {
    const stamp = createPlacedStamp({
        id: 'placed-1',
        sourceStamp: { id: 'source-1', url: 'data:image/png;base64,stamp' },
        placement: {
            xPercent: 0.2,
            yPercent: 0.3,
            widthPercent: 0.18,
            heightPercent: 0.1
        }
    });

    assert.deepEqual(stamp, {
        id: 'placed-1',
        stampId: 'source-1',
        url: 'data:image/png;base64,stamp',
        xPercent: 0.2,
        yPercent: 0.3,
        widthPercent: 0.18,
        heightPercent: 0.1,
        rotation: 0,
        opacity: 0.88,
        brightness: 0.9,
        contrast: 1.25,
        saturation: 1.2,
        blendMode: 'multiply'
    });
});
