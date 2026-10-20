import test from 'node:test';
import assert from 'node:assert/strict';
import { drawStampOnCanvas, getStampRenderPlan } from './stampRenderer.js';

const STAMP = Object.freeze({
    xPercent: 0.1,
    yPercent: 0.2,
    widthPercent: 0.2,
    heightPercent: 0.1,
    rotation: 90,
    opacity: 0.7,
    brightness: 0.8,
    contrast: 1.4,
    saturation: 1.1,
    blendMode: 'multiply'
});

test('creates a render plan from page-relative stamp data', () => {
    const plan = getStampRenderPlan(STAMP, { width: 1000, height: 2000 });

    assert.deepEqual(plan, {
        x: 100,
        y: 400,
        width: 200,
        height: 200,
        centerX: 200,
        centerY: 500,
        rotationRadians: Math.PI / 2,
        opacity: 0.7,
        filter: 'brightness(80%) contrast(140%) saturate(110%)',
        compositeOperation: 'multiply'
    });
});

test('draws a stamp with the render plan applied to the canvas context', () => {
    const calls = [];
    const context = {
        save: () => calls.push(['save']),
        restore: () => calls.push(['restore']),
        translate: (...args) => calls.push(['translate', ...args]),
        rotate: (...args) => calls.push(['rotate', ...args]),
        drawImage: (...args) => calls.push(['drawImage', ...args])
    };
    const image = { id: 'stamp-image' };

    drawStampOnCanvas({
        context,
        image,
        stamp: STAMP,
        pageSize: { width: 1000, height: 2000 }
    });

    assert.equal(context.globalAlpha, 0.7);
    assert.equal(context.filter, 'brightness(80%) contrast(140%) saturate(110%)');
    assert.equal(context.globalCompositeOperation, 'multiply');
    assert.deepEqual(calls, [
        ['save'],
        ['translate', 200, 500],
        ['rotate', Math.PI / 2],
        ['drawImage', image, -100, -100, 200, 200],
        ['restore']
    ]);
});
