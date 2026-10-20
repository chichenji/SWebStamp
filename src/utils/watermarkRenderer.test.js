import test from 'node:test';
import assert from 'node:assert/strict';
import { drawPageWatermark } from './watermarkRenderer.js';
import { DEFAULT_WATERMARK, resolveWatermarkConfig } from './watermarkConfig.js';

const createContext = () => {
    const calls = [];
    return { calls, save: () => calls.push(['save']), restore: () => calls.push(['restore']),
        drawImage: (...args) => calls.push(['drawImage', ...args]),
        createPattern: (...args) => { calls.push(['createPattern', ...args]); return 'pattern'; },
        fillRect: (...args) => calls.push(['fillRect', ...args]) };
};
test('existing watermark settings keep array layout and shared defaults are immutable', () => {
    const input = Object.freeze({ text: 'existing', opacity: 0 });
    const config = resolveWatermarkConfig(input);
    assert.equal(config.layout, 'array');
    assert.equal(config.positionX, 50);
    assert.equal(config.opacity, 0);
    assert.ok(Object.isFrozen(DEFAULT_WATERMARK));
    assert.deepEqual(input, { text: 'existing', opacity: 0 });
});
test('single watermark draws once centered at page-relative position', () => {
    const context = createContext();
    const image = { width: 200, height: 50 };
    drawPageWatermark({ context, pageSize: { width: 800, height: 1000 },
        asset: { image, config: { layout: 'single', positionX: 25, positionY: 80 } } });
    assert.deepEqual(context.calls, [['save'], ['drawImage', image, 100, 775], ['restore']]);
});
test('single watermark position zero is preserved on landscape pages', () => {
    const context = createContext();
    const image = { width: 100, height: 20 };
    drawPageWatermark({ context, pageSize: { width: 1000, height: 500 },
        asset: { image, config: { layout: 'single', positionX: 0, positionY: 0 } } });
    assert.deepEqual(context.calls[1], ['drawImage', image, -50, -10]);
});
test('array watermark repeats over the full page', () => {
    const context = createContext();
    const image = { width: 300, height: 300 };
    drawPageWatermark({ context, pageSize: { width: 500, height: 800 }, asset: { image, config: {} } });
    assert.deepEqual(context.calls, [['save'], ['createPattern', image, 'repeat'], ['fillRect', 0, 0, 500, 800], ['restore']]);
});
test('empty watermark assets do not draw or modify the context', () => {
    const context = createContext();
    drawPageWatermark({ context, pageSize: { width: 500, height: 800 }, asset: { image: null } });
    assert.deepEqual(context.calls, []);
});
