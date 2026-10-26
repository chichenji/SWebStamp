import test from 'node:test';
import assert from 'node:assert/strict';
import { drawPageWatermark, calculateArrayGrid } from './watermarkRenderer.js';
import { DEFAULT_WATERMARK, resolveWatermarkConfig } from './watermarkConfig.js';
import { measureWatermarkContent } from './watermarkHelper.js';

const DEG_TO_RAD = Math.PI / 180;

const createContext = () => {
    const calls = [];
    return {
        calls,
        save: () => calls.push(['save']),
        restore: () => calls.push(['restore']),
        translate: (x, y) => calls.push(['translate', x, y]),
        rotate: angle => calls.push(['rotate', angle]),
        drawImage: (...args) => calls.push(['drawImage', ...args])
    };
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

test('single watermark follows rotation transform order and centers at percentage position', () => {
    const context = createContext();
    const image = { width: 200, height: 50 };
    drawPageWatermark({
        context,
        pageSize: { width: 800, height: 1000 },
        asset: { image, config: { layout: 'single', positionX: 25, positionY: 80, angle: -30 } }
    });
    assert.deepEqual(context.calls, [
        ['save'],
        ['translate', 200, 800],
        ['rotate', -30 * DEG_TO_RAD],
        ['drawImage', image, -100, -25],
        ['restore']
    ]);
});

test('single watermark position zero is preserved on landscape pages', () => {
    const context = createContext();
    const image = { width: 100, height: 20 };
    drawPageWatermark({
        context,
        pageSize: { width: 1000, height: 500 },
        asset: { image, config: { layout: 'single', positionX: 0, positionY: 0, angle: 45 } }
    });
    assert.deepEqual(context.calls, [
        ['save'],
        ['translate', 0, 0],
        ['rotate', 45 * DEG_TO_RAD],
        ['drawImage', image, -50, -10],
        ['restore']
    ]);
});

test('array watermark rotates whole grid once around page center and aligns row items', () => {
    const context = createContext();
    const image = { width: 120, height: 40 };
    drawPageWatermark({
        context,
        pageSize: { width: 600, height: 800 },
        asset: { image, config: { layout: 'array', angle: -45, density: 1.5 } }
    });
    assert.equal(context.calls[0][0], 'save');
    assert.deepEqual(context.calls[1], ['translate', 300, 400]);
    assert.deepEqual(context.calls[2], ['rotate', -45 * DEG_TO_RAD]);
    assert.equal(context.calls[context.calls.length - 1][0], 'restore');

    const drawCalls = context.calls.slice(3, -1);
    assert.ok(drawCalls.length > 5, 'Must draw multiple watermark items');
    for (const call of drawCalls) {
        assert.equal(call[0], 'drawImage');
        assert.equal(call[1], image);
        assert.equal(typeof call[2], 'number');
        assert.equal(typeof call[3], 'number');
    }
});

test('array grid covers all page corners for key angles in portrait and landscape', () => {
    const angles = [0, 45, -45, 90, -90, 180];
    const pageSizes = [{ width: 595, height: 842 }, { width: 842, height: 595 }];
    const imageSize = { width: 150, height: 35 };

    for (const pageSize of pageSizes) {
        for (const angle of angles) {
            const grid = calculateArrayGrid({ pageSize, imageSize, density: 1.5, angle });
            const rad = angle * DEG_TO_RAD;
            const cos = Math.abs(Math.cos(rad));
            const sin = Math.abs(Math.sin(rad));
            const expectedBoundX = (pageSize.width / 2) * cos + (pageSize.height / 2) * sin;
            const expectedBoundY = (pageSize.width / 2) * sin + (pageSize.height / 2) * cos;
            assert.ok(Math.abs(grid.boundX - expectedBoundX) < 1e-6);
            assert.ok(Math.abs(grid.boundY - expectedBoundY) < 1e-6);

            const maxCoverageX = grid.maxCols * grid.stepX + imageSize.width / 2;
            const maxCoverageY = grid.maxRows * grid.stepY + imageSize.height / 2;
            assert.ok(maxCoverageX >= grid.boundX, `Coverage X must cover boundX for angle ${angle}`);
            assert.ok(maxCoverageY >= grid.boundY, `Coverage Y must cover boundY for angle ${angle}`);
        }
    }
});

test('next items advance to the right based on content width plus configurable positive gap', () => {
    const pageSize = { width: 800, height: 1000 };
    const smallImage = { width: 100, height: 30 };
    const largeImage = { width: 300, height: 30 };

    const gridSmall = calculateArrayGrid({ pageSize, imageSize: smallImage, density: 1.5 });
    const gridLarge = calculateArrayGrid({ pageSize, imageSize: largeImage, density: 1.5 });

    assert.equal(gridSmall.gapX, gridLarge.gapX);
    assert.ok(gridSmall.gapX > 0, 'Gap must be strictly positive');
    assert.equal(gridSmall.stepX, smallImage.width + gridSmall.gapX);
    assert.equal(gridLarge.stepX, largeImage.width + gridLarge.gapX);

    const gridDense = calculateArrayGrid({ pageSize, imageSize: smallImage, density: 2.0 });
    assert.ok(gridDense.gapX > gridSmall.gapX);
    assert.equal(gridDense.stepX, smallImage.width + gridDense.gapX);
});

test('measureWatermarkContent provides padding on all four edges and prevents glyph-bottom cropping', () => {
    const mockContext = {
        font: '',
        textAlign: '',
        textBaseline: '',
        measureText: text => ({
            width: text.length * 60,
            actualBoundingBoxAscent: 95,
            actualBoundingBoxDescent: 30,
            actualBoundingBoxLeft: (text.length * 60) / 2,
            actualBoundingBoxRight: (text.length * 60) / 2
        })
    };
    const longText = '内部资料 SAMPLE 长文字水印 gj 中文';
    const config = { type: 'text', text: longText, fontSize: 120, layout: 'array', density: 0.5 };
    const size = measureWatermarkContent({ context: mockContext, config });

    assert.ok(size.width > 1000, 'Width must retain natural text size');
    assert.ok(size.height >= 95 + 30 + 32, 'Height must account for ascent, descent and vertical padding');
    assert.ok(size.baselineY[0] - 95 >= 16, 'Top ink must leave positive padding');
    assert.ok(size.height - (size.baselineY[0] + 30) >= 16, 'Bottom ink must leave positive padding, not touch edge');
    assert.ok(size.centerX - (longText.length * 60) / 2 >= 16, 'Left ink must leave positive padding');
    assert.ok(size.width - (size.centerX + (longText.length * 60) / 2) >= 16, 'Right ink must leave positive padding');
});

test('measureWatermarkContent ensures multiline text glyphs do not overlap', () => {
    const mockContext = {
        font: '',
        textAlign: '',
        textBaseline: '',
        measureText: () => ({
            width: 300,
            actualBoundingBoxAscent: 20,
            actualBoundingBoxDescent: 10,
            actualBoundingBoxLeft: 150,
            actualBoundingBoxRight: 150
        })
    };
    const config = { type: 'text', text: 'Line 1 gj\nLine 2 gj\nLine 3', fontSize: 24 };
    const size = measureWatermarkContent({ context: mockContext, config });

    assert.equal(size.baselineY.length, 3);
    for (let i = 1; i < size.baselineY.length; i++) {
        const lineAdvance = size.baselineY[i] - size.baselineY[i - 1];
        assert.ok(lineAdvance >= 20 + 10 + 8, 'Line advance must exceed ascent + descent + line gap to prevent overlap');
    }
});

test('measureWatermarkContent preserves default max 240 image fit without upscaling small images', () => {
    const small = { width: 60, height: 40 };
    const smallFit = measureWatermarkContent({ context: {}, config: {}, image: small });
    assert.deepEqual(smallFit, { width: 60, height: 40 }, 'Small image must not upscale');

    const large = { width: 1200, height: 600 };
    const largeFit = measureWatermarkContent({ context: {}, config: {}, image: large });
    assert.deepEqual(largeFit, { width: 240, height: 120 }, 'Large image must fit within 240 while preserving aspect ratio');
});

test('measureWatermarkContent errors when actualBoundingBox metrics are missing and handles empty lines', () => {
    const invalidContext = {
        font: '',
        textAlign: '',
        textBaseline: '',
        measureText: () => ({ width: 100 })
    };
    assert.throws(
        () => measureWatermarkContent({ context: invalidContext, config: { text: 'test', fontSize: 24 } }),
        /measureText does not provide required actualBoundingBox metrics/
    );

    const emptyLineContext = {
        font: '',
        textAlign: '',
        textBaseline: '',
        measureText: text => ({
            width: text ? 100 : 0,
            actualBoundingBoxAscent: text ? 20 : 0,
            actualBoundingBoxDescent: text ? 5 : 0,
            actualBoundingBoxLeft: text ? 50 : 0,
            actualBoundingBoxRight: text ? 50 : 0
        })
    };
    const emptyResult = measureWatermarkContent({ context: emptyLineContext, config: { text: '', fontSize: 24 } });
    assert.ok(emptyResult.width >= 32);
    assert.ok(emptyResult.height >= 32);
});

test('resolveWatermarkConfig and calculateArrayGrid reject invalid configs with informative errors', () => {
    assert.throws(() => resolveWatermarkConfig({ density: -1 }), /density must be a positive finite number/);
    assert.throws(() => resolveWatermarkConfig({ density: 'abc' }), /density must be a positive finite number/);
    assert.throws(() => resolveWatermarkConfig({ angle: NaN }), /angle must be a finite number/);
    assert.throws(() => resolveWatermarkConfig({ fontSize: 0 }), /fontSize must be a positive finite number/);
    assert.throws(() => resolveWatermarkConfig({ opacity: 2 }), /opacity must be a number between 0 and 1/);

    const validSize = { width: 100, height: 100 };
    assert.throws(() => calculateArrayGrid({ pageSize: { width: 0, height: 100 }, imageSize: validSize, density: 1 }), /Invalid page dimensions/);
    assert.throws(() => calculateArrayGrid({ pageSize: validSize, imageSize: { width: 0, height: 100 }, density: 1 }), /Invalid image dimensions/);
    assert.throws(() => calculateArrayGrid({ pageSize: validSize, imageSize: validSize, density: -1 }), /density must be a positive finite number/);
});

test('drawPageWatermark handles empty asset and rejects invalid context or page dimensions', () => {
    const context = createContext();
    drawPageWatermark({ context, pageSize: { width: 500, height: 800 }, asset: null });
    drawPageWatermark({ context, pageSize: { width: 500, height: 800 }, asset: { image: null } });
    assert.deepEqual(context.calls, [], 'Empty asset must not draw or modify context');

    const validAsset = { image: { width: 100, height: 40 } };
    assert.throws(() => drawPageWatermark({ context: null, pageSize: { width: 500, height: 800 }, asset: validAsset }), /context is required/);
    assert.throws(() => drawPageWatermark({ context, pageSize: { width: -10, height: 800 }, asset: validAsset }), /Invalid page dimensions/);
    assert.throws(() => drawPageWatermark({ context, pageSize: { width: 500, height: 800 }, asset: { image: { width: 0, height: 10 } } }), /Invalid watermark image dimensions/);
});

test('calculateArrayGrid defaults angle only when omitted or undefined and rejects explicit invalid values', () => {
    const validSize = { width: 400, height: 600 };
    const imageSize = { width: 100, height: 40 };

    const omittedResult = calculateArrayGrid({ pageSize: validSize, imageSize, density: 1 });
    const undefinedResult = calculateArrayGrid({ pageSize: validSize, imageSize, density: 1, angle: undefined });
    assert.equal(omittedResult.boundX, undefinedResult.boundX);
    assert.equal(omittedResult.stepX, undefinedResult.stepX);

    assert.throws(
        () => calculateArrayGrid({ pageSize: validSize, imageSize, density: 1, angle: NaN }),
        /Watermark angle must be a finite number, got: NaN/
    );
    assert.throws(
        () => calculateArrayGrid({ pageSize: validSize, imageSize, density: 1, angle: false }),
        /Watermark angle must be a finite number, got: false/
    );
    assert.throws(
        () => calculateArrayGrid({ pageSize: validSize, imageSize, density: 1, angle: '' }),
        /Watermark angle must be a finite number, got: /
    );
    assert.throws(
        () => calculateArrayGrid({ pageSize: validSize, imageSize, density: 1, angle: null }),
        /Watermark angle must be a finite number, got: null/
    );
});
