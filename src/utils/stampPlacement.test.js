import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStampPlacement, createPlacedStamp, calculateInspectorStampSize } from './stampPlacement.js';
import { getResizeUpdates } from '../components/useStampInteraction.js';

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

test('tall material preserves aspect ratio and fits both dimensions within bounds', () => {
    const pageRect = { left: 0, top: 0, width: 600, height: 600 }; // square page
    const tallAspectRatio = 0.2; // 1:5 tall
    const placement = calculateStampPlacement({
        clientX: 300,
        clientY: 300,
        pageRect,
        aspectRatio: tallAspectRatio,
        widthPercent: 0.3
    });

    // Height must be <= 0.8, and height / width must match 1 / 0.2 = 5
    assert.ok(placement.heightPercent <= 0.8);
    assert.ok(placement.widthPercent <= 0.8);
    const displayedAspect = (placement.widthPercent * 600) / (placement.heightPercent * 600);
    assert.ok(Math.abs(displayedAspect - tallAspectRatio) < 0.001);
});

test('calculateInspectorStampSize keeps stamp inside page bounds and preserves aspect ratio', () => {
    const stampNearEdge = {
        xPercent: 0.8,
        yPercent: 0.8,
        widthPercent: 0.15,
        heightPercent: 0.15
    };

    const fitResult = calculateInspectorStampSize({
        stamp: stampNearEdge,
        requestedWidth: 0.4
    });

    assert.ok(fitResult.xPercent + fitResult.widthPercent <= 1.0001);
    assert.ok(fitResult.yPercent + fitResult.heightPercent <= 1.0001);
    // Aspect ratio preserved (1:1):
    assert.equal(fitResult.widthPercent, fitResult.heightPercent);
});

test('extreme tall material adapts width below 0.05 to preserve aspect ratio within page height, preserving requested width in global preferences', () => {
    const pageRect = { left: 0, top: 0, width: 800, height: 800 };
    const extremeAspectRatio = 0.01; // 1:100 tall
    const requestedWidth = 0.18;

    // 1. Placement of extreme tall stamp adapts width to fit max height 0.8
    const placement = calculateStampPlacement({
        clientX: 400,
        clientY: 400,
        pageRect,
        aspectRatio: extremeAspectRatio,
        widthPercent: requestedWidth
    });

    assert.ok(placement.widthPercent < 0.05, `Width (${placement.widthPercent}) should adapt below 0.05`);
    assert.ok(placement.heightPercent <= 0.8, `Height (${placement.heightPercent}) must not exceed 0.8`);
    assert.equal(placement.requestedWidthPercent, requestedWidth);
    // Aspect ratio preserved (1:100)
    const displayedRatio = (placement.widthPercent * 800) / (placement.heightPercent * 800);
    assert.ok(Math.abs(displayedRatio - extremeAspectRatio) < 0.0001);

    // 2. Inspector resize on extreme tall material
    const inspectorFit = calculateInspectorStampSize({
        stamp: placement,
        requestedWidth: 0.3
    });
    assert.ok(inspectorFit.widthPercent < 0.05);
    assert.equal(inspectorFit.requestedWidthPercent, 0.3);
    assert.equal(inspectorFit.isConstrained, true);

    // 3. Placed stamp creation strips requestedWidthPercent from clean placement
    const placedStamp = createPlacedStamp({
        id: 'tall-1',
        sourceStamp: { id: 'source-tall', url: 'data:image/png;base64,tall' },
        placement,
        initialPreferences: { widthPercent: requestedWidth }
    });
    assert.equal(placedStamp.widthPercent, placement.widthPercent);
    assert.equal(placedStamp.requestedWidthPercent, undefined);

    // 4. Subsequent standard stamp (aspectRatio = 1) inherits updated global preference 0.3
    const standardPlacement = calculateStampPlacement({
        clientX: 400,
        clientY: 400,
        pageRect,
        aspectRatio: 1,
        widthPercent: inspectorFit.requestedWidthPercent
    });
    assert.equal(standardPlacement.widthPercent, 0.3);
    assert.equal(standardPlacement.heightPercent, 0.3);
});

test('getResizeUpdates scales proportionally and records requestedWidthPercent', () => {
    const interaction = {
        stamp: {
            xPercent: 0.1,
            yPercent: 0.1,
            widthPercent: 0.2,
            heightPercent: 0.1
        }
    };
    const updates = getResizeUpdates(interaction, { x: 0.1 });
    assert.equal(updates.widthPercent, 0.3);
    assert.equal(updates.heightPercent, 0.15); // ratio = 0.5 preserved
    assert.equal(updates.requestedWidthPercent, 0.3);

    // Constrained at boundary
    const boundaryInteraction = {
        stamp: {
            xPercent: 0.8,
            yPercent: 0.1,
            widthPercent: 0.15,
            heightPercent: 0.15
        }
    };
    const constrainedUpdates = getResizeUpdates(boundaryInteraction, { x: 0.2 });
    assert.ok(constrainedUpdates.widthPercent <= 0.2); // clamped by 1 - 0.8 = 0.2
    assert.equal(constrainedUpdates.requestedWidthPercent, 0.35); // unconstrained request preserved
});
