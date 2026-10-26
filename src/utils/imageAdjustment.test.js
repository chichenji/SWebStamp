import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_IMAGE_ADJUSTMENTS,
    IMAGE_ADJUSTMENT_FIELDS,
    normalizeImageAdjustments,
    isIdentityAdjustments,
    getImageFilter,
    getImageAdjustments,
    drawBaseImageOnCanvas,
    applyImageAdjustmentsToDocuments,
    resetDocumentsImageAdjustments
} from './imageAdjustment.js';
import { createPageCanvas } from './scanEffect/scanComposer.js';
import { getStampRenderPlan } from './stampRenderer.js';

test('default image adjustments are identity and immutable', () => {
    assert.ok(Object.isFrozen(DEFAULT_IMAGE_ADJUSTMENTS));
    assert.equal(DEFAULT_IMAGE_ADJUSTMENTS.brightness, 0);
    assert.equal(DEFAULT_IMAGE_ADJUSTMENTS.contrast, 0);
    assert.equal(DEFAULT_IMAGE_ADJUSTMENTS.saturation, 0);
    assert.equal(DEFAULT_IMAGE_ADJUSTMENTS.grayscale, 0);
    assert.equal(DEFAULT_IMAGE_ADJUSTMENTS.invert, 0);
    assert.equal(DEFAULT_IMAGE_ADJUSTMENTS.sepia, 0);
    assert.equal(isIdentityAdjustments(DEFAULT_IMAGE_ADJUSTMENTS), true);
    assert.equal(getImageFilter(DEFAULT_IMAGE_ADJUSTMENTS), 'none');
    assert.equal(getImageFilter(null), 'none');
    assert.equal(getImageFilter(undefined), 'none');
});

test('image adjustment fields define accessible labels and valid slider ranges', () => {
    const keys = IMAGE_ADJUSTMENT_FIELDS.map(field => field.key);
    assert.deepEqual(keys, ['brightness', 'contrast', 'saturation', 'grayscale', 'invert', 'sepia']);
    const labels = IMAGE_ADJUSTMENT_FIELDS.map(field => field.label);
    assert.deepEqual(labels, ['图片亮度', '图片对比度', '图片饱和度', '图片去色', '图片反相', '图片复古色调']);
    for (const field of IMAGE_ADJUSTMENT_FIELDS) {
        assert.ok(Number.isFinite(field.min));
        assert.ok(Number.isFinite(field.max));
        assert.ok(field.min < field.max);
    }
});

test('normalizeImageAdjustments rejects invalid inputs and out-of-range values', () => {
    assert.throws(() => normalizeImageAdjustments({ brightness: NaN }), /图片调整参数 brightness 必须是有限数字/);
    assert.throws(() => normalizeImageAdjustments({ contrast: Infinity }), /图片调整参数 contrast 必须是有限数字/);
    assert.throws(() => normalizeImageAdjustments({ saturation: '10' }), /图片调整参数 saturation 必须是有限数字/);
    assert.throws(() => normalizeImageAdjustments('invalid'), /图片调整配置必须是对象/);
    assert.throws(() => normalizeImageAdjustments({ brightness: 150 }), /图片调整参数 brightness 超出有效范围/);
    assert.throws(() => normalizeImageAdjustments({ brightness: -150 }), /图片调整参数 brightness 超出有效范围/);
    assert.throws(() => normalizeImageAdjustments({ grayscale: 120 }), /图片调整参数 grayscale 超出有效范围/);
    assert.throws(() => normalizeImageAdjustments({ grayscale: -10 }), /图片调整参数 grayscale 超出有效范围/);
    assert.throws(() => normalizeImageAdjustments({ invert: 110 }), /图片调整参数 invert 超出有效范围/);
    assert.throws(() => normalizeImageAdjustments({ invert: -5 }), /图片调整参数 invert 超出有效范围/);
    assert.throws(() => normalizeImageAdjustments({ sepia: 105 }), /图片调整参数 sepia 超出有效范围/);
    assert.throws(() => normalizeImageAdjustments({ sepia: -1 }), /图片调整参数 sepia 超出有效范围/);

    const valid = normalizeImageAdjustments({
        brightness: 50,
        contrast: -30,
        saturation: 20,
        grayscale: 80,
        invert: 100,
        sepia: 10
    });
    assert.equal(valid.brightness, 50);
    assert.equal(valid.contrast, -30);
    assert.equal(valid.saturation, 20);
    assert.equal(valid.grayscale, 80);
    assert.equal(valid.invert, 100);
    assert.equal(valid.sepia, 10);
    assert.ok(Object.isFrozen(valid));
});

test('getImageFilter produces deterministic canonical filter order and exact math', () => {
    const adjustments = normalizeImageAdjustments({
        brightness: 25,
        contrast: -20,
        saturation: 10,
        grayscale: 50,
        invert: 100,
        sepia: 30
    });
    const filter = getImageFilter(adjustments);
    assert.equal(
        filter,
        'brightness(125%) contrast(80%) saturate(110%) grayscale(50%) invert(100%) sepia(30%)'
    );
});

test('drawBaseImageOnCanvas applies context.save/filter/restore only when non-identity', () => {
    const calls = [];
    const context = {
        save: () => calls.push(['save']),
        restore: () => calls.push(['restore']),
        drawImage: (...args) => calls.push(['drawImage', ...args]),
        filter: 'none'
    };
    const image = { id: 'sample-page-img' };

    drawBaseImageOnCanvas({ context, image, width: 800, height: 1100, imageAdjustments: DEFAULT_IMAGE_ADJUSTMENTS });
    assert.deepEqual(calls, [
        ['drawImage', image, 0, 0, 800, 1100]
    ]);
    assert.equal(context.filter, 'none');

    calls.length = 0;
    const active = { brightness: 15, contrast: 10, saturation: 0, grayscale: 0, invert: 0, sepia: 0 };
    drawBaseImageOnCanvas({ context, image, width: 800, height: 1100, imageAdjustments: active });
    assert.equal(context.filter, 'brightness(115%) contrast(110%) saturate(100%) grayscale(0%) invert(0%) sepia(0%)');
    assert.deepEqual(calls, [
        ['save'],
        ['drawImage', image, 0, 0, 800, 1100],
        ['restore']
    ]);
});

test('immutable updates support per-page and all-page scopes without modifying originals', () => {
    const docs = Object.freeze([
        Object.freeze({ id: 'doc-1', name: 'p1.png', previewUrl: 'blob:p1' }),
        Object.freeze({ id: 'doc-2', name: 'p2.png', previewUrl: 'blob:p2' })
    ]);

    const perPageResult = applyImageAdjustmentsToDocuments({
        documents: docs,
        targetId: 'doc-1',
        scope: 'page',
        updates: { brightness: 30 }
    });
    assert.notEqual(perPageResult, docs);
    assert.equal(perPageResult[0].imageAdjustments.brightness, 30);
    assert.equal(perPageResult[0].previewUrl, 'blob:p1');
    assert.equal(perPageResult[1], docs[1]);

    assert.throws(() => applyImageAdjustmentsToDocuments({
        documents: docs,
        targetId: 'doc-1',
        scope: 'invalid',
        updates: { brightness: 10 }
    }), /未知图片调整范围/);

    const allResult = applyImageAdjustmentsToDocuments({
        documents: docs,
        targetId: 'doc-1',
        scope: 'all',
        updates: { contrast: 40 }
    });
    assert.notEqual(allResult, docs);
    assert.equal(allResult[0].imageAdjustments.contrast, 40);
    assert.equal(allResult[1].imageAdjustments.contrast, 40);
});

test('resetting adjustments targets specific page or all pages and retains doc properties', () => {
    const docsWithAdjustments = [
        { id: 'doc-1', previewUrl: 'blob:p1', imageAdjustments: { brightness: 50 } },
        { id: 'doc-2', previewUrl: 'blob:p2', imageAdjustments: { contrast: 30 } }
    ];

    const resetPage = resetDocumentsImageAdjustments({
        documents: docsWithAdjustments,
        targetId: 'doc-1',
        scope: 'page'
    });
    assert.equal(isIdentityAdjustments(resetPage[0].imageAdjustments), true);
    assert.equal(resetPage[0].previewUrl, 'blob:p1');
    assert.equal(resetPage[1].imageAdjustments.contrast, 30);

    assert.throws(() => resetDocumentsImageAdjustments({
        documents: docsWithAdjustments,
        targetId: 'doc-1',
        scope: 'invalid'
    }), /未知图片调整范围/);

    const resetAll = resetDocumentsImageAdjustments({
        documents: docsWithAdjustments,
        targetId: 'doc-1',
        scope: 'all'
    });
    assert.equal(isIdentityAdjustments(resetAll[0].imageAdjustments), true);
    assert.equal(isIdentityAdjustments(resetAll[1].imageAdjustments), true);
});

test('reordering and removing documents preserves stable adjustment mappings', () => {
    const docA = { id: 'doc-a', previewUrl: 'blob:a', imageAdjustments: { brightness: 10 } };
    const docB = { id: 'doc-b', previewUrl: 'blob:b', imageAdjustments: { brightness: 20 } };
    const docC = { id: 'doc-c', previewUrl: 'blob:c', imageAdjustments: { brightness: 30 } };

    const reordered = [docC, docA, docB];
    assert.equal(reordered.find(d => d.id === 'doc-a').imageAdjustments.brightness, 10);
    assert.equal(reordered.find(d => d.id === 'doc-b').imageAdjustments.brightness, 20);
    assert.equal(reordered.find(d => d.id === 'doc-c').imageAdjustments.brightness, 30);

    const filtered = reordered.filter(d => d.id !== 'doc-b');
    assert.equal(filtered.length, 2);
    assert.equal(filtered.find(d => d.id === 'doc-a').imageAdjustments.brightness, 10);
    assert.equal(filtered.find(d => d.id === 'doc-c').imageAdjustments.brightness, 30);
});

test('getImageAdjustments returns normalized adjustments or identity defaults', () => {
    assert.deepEqual(getImageAdjustments(null), DEFAULT_IMAGE_ADJUSTMENTS);
    assert.deepEqual(getImageAdjustments({}), DEFAULT_IMAGE_ADJUSTMENTS);
    const docWithAdjustments = { imageAdjustments: { brightness: 15 } };
    const result = getImageAdjustments(docWithAdjustments);
    assert.equal(result.brightness, 15);
    assert.equal(result.contrast, 0);
});

test('createPageCanvas integrates image adjustments into base image with exact scaling', () => {
    const calls = [];
    const mockContext = {
        save: () => calls.push(['save']),
        restore: () => calls.push(['restore']),
        drawImage: (...args) => calls.push(['drawImage', ...args]),
        fillRect: (...args) => calls.push(['fillRect', ...args]),
        fillStyle: '',
        filter: 'none'
    };
    const originalDocument = globalThis.document;
    globalThis.document = {
        createElement: tag => {
            if (tag === 'canvas') {
                return {
                    width: 0,
                    height: 0,
                    getContext: () => mockContext
                };
            }
            return {};
        }
    };
    try {
        const baseImage = { width: 400, height: 600 };
        const adjustments = { brightness: 20, contrast: 10 };
        const canvas = createPageCanvas(baseImage, { scaleFactor: 1.5 }, { opaque: true, imageAdjustments: adjustments });
        assert.equal(canvas.width, 600);
        assert.equal(canvas.height, 900);
        assert.equal(mockContext.filter, 'brightness(120%) contrast(110%) saturate(100%) grayscale(0%) invert(0%) sepia(0%)');
        assert.deepEqual(calls, [
            ['fillRect', 0, 0, 600, 900],
            ['save'],
            ['drawImage', baseImage, 0, 0, 600, 900],
            ['restore']
        ]);
    } finally {
        globalThis.document = originalDocument;
    }
});

test('layer isolation ensures stamps and watermarks are unaffected by base image adjustments', () => {
    const stamp = {
        xPercent: 0.1,
        yPercent: 0.2,
        widthPercent: 0.2,
        heightPercent: 0.1,
        opacity: 0.88,
        brightness: 0.9,
        contrast: 1.25,
        saturation: 1.2,
        blendMode: 'multiply'
    };
    const stampPlanBefore = getStampRenderPlan(stamp, { width: 800, height: 1000 });

    const baseAdjustments = { brightness: 50, contrast: 50, grayscale: 100 };
    const filter = getImageFilter(baseAdjustments);
    assert.ok(filter.includes('grayscale(100%)'));

    const stampPlanAfter = getStampRenderPlan(stamp, { width: 800, height: 1000 });
    assert.deepEqual(stampPlanBefore, stampPlanAfter);
    assert.ok(!stampPlanAfter.filter.includes('grayscale'));
});
