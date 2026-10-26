import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_STAMP_PREFERENCES,
    STAMP_PREFERENCES_KEY,
    loadStampPreferences,
    saveStampPreferencesToStorage,
    extractStampPreferences
} from './stampPreferences.js';
import { calculateStampPlacement, createPlacedStamp } from './stampPlacement.js';
import { hasStampStyleUpdate } from '../context/useStampPreferences.js';

const createMockStorage = (initial = {}) => {
    const store = new Map(Object.entries(initial));
    const calls = { get: [], set: [], remove: [] };
    return {
        store,
        calls,
        getItem: (key) => {
            calls.get.push(key);
            return store.has(key) ? store.get(key) : null;
        },
        setItem: (key, val) => {
            calls.set.push({ key, val });
            store.set(key, String(val));
        },
        removeItem: (key) => {
            calls.remove.push(key);
            store.delete(key);
        }
    };
};

test('clean launch returns valid defaults without writing to storage on mount', () => {
    const storage = createMockStorage();
    const result = loadStampPreferences(storage);

    assert.equal(result.status, 'idle');
    assert.equal(result.error, null);
    assert.deepEqual(result.preferences, DEFAULT_STAMP_PREFERENCES);
    assert.equal(storage.calls.set.length, 0);
    assert.equal(storage.store.size, 0);
});

test('saves and reloads stamp preferences roundtrip without forbidden properties', () => {
    const storage = createMockStorage();
    const userAdjustments = {
        widthPercent: 0.28,
        rotation: 45,
        opacity: 0.75,
        brightness: 1.1,
        contrast: 1.4,
        saturation: 1.3,
        blendMode: 'normal',
        // Forbidden keys that must NEVER be persisted:
        docId: 'doc-123',
        xPercent: 0.5,
        yPercent: 0.6,
        id: 'placed-456',
        stampId: 'material-789',
        url: 'data:image/png;base64,SECRET_STAMP'
    };

    const saveResult = saveStampPreferencesToStorage(userAdjustments, storage);
    assert.equal(saveResult.ok, true);

    const storedRaw = storage.store.get(STAMP_PREFERENCES_KEY);
    const parsedStored = JSON.parse(storedRaw);
    assert.equal(parsedStored.version, 1);
    assert.equal(parsedStored.settings.widthPercent, 0.28);
    assert.equal(parsedStored.settings.rotation, 45);
    assert.equal(parsedStored.settings.opacity, 0.75);
    assert.equal(parsedStored.settings.blendMode, 'normal');

    // Forbidden keys must not exist in storage:
    assert.equal(parsedStored.settings.docId, undefined);
    assert.equal(parsedStored.settings.xPercent, undefined);
    assert.equal(parsedStored.settings.yPercent, undefined);
    assert.equal(parsedStored.settings.url, undefined);
    assert.equal(parsedStored.settings.stampId, undefined);

    const loadResult = loadStampPreferences(storage);
    assert.equal(loadResult.status, 'idle');
    assert.deepEqual(loadResult.preferences, {
        widthPercent: 0.28,
        rotation: 45,
        opacity: 0.75,
        brightness: 1.1,
        contrast: 1.4,
        saturation: 1.3,
        blendMode: 'normal'
    });
});

test('global reuse: adjustment from Material A is inherited by Material B with fresh aspect ratio geometry', () => {
    const storage = createMockStorage();
    // Material A was adjusted to 30% width and 15 deg rotation
    saveStampPreferencesToStorage({
        widthPercent: 0.30,
        rotation: 15,
        opacity: 0.92,
        brightness: 1.05,
        contrast: 1.2,
        saturation: 1.1,
        blendMode: 'multiply'
    }, storage);

    const { preferences } = loadStampPreferences(storage);

    // Material B is a rectangle (aspectRatio = 2.0), placed on a landscape page (800x600)
    const landscapePageRect = { left: 0, top: 0, width: 800, height: 600 };
    const placement = calculateStampPlacement({
        clientX: 400,
        clientY: 300,
        pageRect: landscapePageRect,
        aspectRatio: 2.0,
        widthPercent: preferences.widthPercent
    });

    const newPlacedStamp = createPlacedStamp({
        id: 'placed-mat-b',
        sourceStamp: { id: 'stamp-mat-b', url: 'blob:mat-b' },
        placement,
        initialPreferences: preferences
    });

    // Width percent matches global preferences:
    assert.equal(newPlacedStamp.widthPercent, 0.30);
    // Height percent was freshly calculated using Material B's aspect ratio and page dimensions:
    // (0.30 / 2.0) * (800 / 600) = 0.15 * 1.333333 = 0.2
    assert.equal(Math.round(newPlacedStamp.heightPercent * 100) / 100, 0.2);
    // Rotation and appearance inherited:
    assert.equal(newPlacedStamp.rotation, 15);
    assert.equal(newPlacedStamp.opacity, 0.92);
    assert.equal(newPlacedStamp.brightness, 1.05);
    assert.equal(newPlacedStamp.contrast, 1.2);
    assert.equal(newPlacedStamp.blendMode, 'multiply');
    // Source stamp identity is Material B:
    assert.equal(newPlacedStamp.stampId, 'stamp-mat-b');
});

test('corrupt storage data is preserved intact on read and exposes corrupt status', () => {
    const storage = createMockStorage({
        [STAMP_PREFERENCES_KEY]: '{ invalid json content !!!'
    });

    const result = loadStampPreferences(storage);
    assert.equal(result.status, 'corrupt');
    assert.match(result.error, /JSON/i);
    assert.deepEqual(result.preferences, DEFAULT_STAMP_PREFERENCES);
    // Raw corrupt data MUST NOT be overwritten or removed on mount:
    assert.equal(storage.store.get(STAMP_PREFERENCES_KEY), '{ invalid json content !!!');
    assert.equal(storage.calls.set.length, 0);
    assert.equal(storage.calls.remove.length, 0);
});

test('schema invalidation preserves corrupt data until explicit reset', () => {
    const corruptPayload = JSON.stringify({
        version: 1,
        settings: { widthPercent: 'not-a-number' }
    });
    const storage = createMockStorage({
        [STAMP_PREFERENCES_KEY]: corruptPayload
    });

    const load1 = loadStampPreferences(storage);
    assert.equal(load1.status, 'corrupt');
    assert.equal(storage.store.get(STAMP_PREFERENCES_KEY), corruptPayload);

    // Explicit reset replaces corrupt data with clean defaults:
    const saveReset = saveStampPreferencesToStorage(DEFAULT_STAMP_PREFERENCES, storage);
    assert.equal(saveReset.ok, true);

    const load2 = loadStampPreferences(storage);
    assert.equal(load2.status, 'idle');
    assert.deepEqual(load2.preferences, DEFAULT_STAMP_PREFERENCES);
});

test('quota or security write denial exposes error and allows retry when storage recovers', () => {
    let shouldFail = true;
    const storage = {
        getItem: () => null,
        setItem: (key, val) => {
            if (shouldFail) {
                const err = new Error('Quota exceeded');
                err.name = 'QuotaExceededError';
                throw err;
            }
            thisStore.set(key, val);
        },
        removeItem: () => {}
    };
    const thisStore = new Map();

    const write1 = saveStampPreferencesToStorage({ widthPercent: 0.25 }, storage);
    assert.equal(write1.ok, false);
    assert.match(write1.error, /存储空间不足/);

    // Retry after quota recovers:
    shouldFail = false;
    const write2 = saveStampPreferencesToStorage({ widthPercent: 0.25 }, storage);
    assert.equal(write2.ok, true);
    assert.ok(thisStore.has(STAMP_PREFERENCES_KEY));
});

test('rotation preserves finite fractional precision without rounding', () => {
    const extracted = extractStampPreferences({ rotation: 15.65 });
    assert.equal(extracted.rotation, 15.65);
});

test('extraction rejects explicit invalid values while merging omitted values with defaults', () => {
    // Merging omitted
    const merged = extractStampPreferences({ widthPercent: 0.25 });
    assert.equal(merged.widthPercent, 0.25);
    assert.equal(merged.rotation, DEFAULT_STAMP_PREFERENCES.rotation);
    assert.equal(merged.blendMode, 'multiply');

    // Rejecting explicit invalid null / string / NaN / out-of-range
    assert.throws(() => extractStampPreferences({ widthPercent: null }), /宽度/);
    assert.throws(() => extractStampPreferences({ widthPercent: '0.25' }), /宽度/);
    assert.throws(() => extractStampPreferences({ widthPercent: 0.95 }), /宽度/);
    assert.throws(() => extractStampPreferences({ rotation: NaN }), /角度/);
    assert.throws(() => extractStampPreferences({ opacity: 1.5 }), /透明度/);
    assert.throws(() => extractStampPreferences({ blendMode: 'screen' }), /混合模式/);
});

const REQUIRED_KEYS = [
    'widthPercent', 'rotation', 'opacity', 'brightness',
    'contrast', 'saturation', 'blendMode'
];

for (const key of REQUIRED_KEYS) {
    test(`deletion of required stamp field "${key}" causes corrupt result and preserves raw`, () => {
        const copy = { ...DEFAULT_STAMP_PREFERENCES };
        delete copy[key];
        const raw = JSON.stringify({ version: 1, settings: copy });
        const storage = createMockStorage({ [STAMP_PREFERENCES_KEY]: raw });

        const result = loadStampPreferences(storage);
        assert.equal(result.status, 'corrupt');
        assert.match(result.error, new RegExp(key));
        assert.equal(storage.store.get(STAMP_PREFERENCES_KEY), raw);
        assert.equal(storage.calls.set.length, 0);
    });
}

test('hasStampStyleUpdate identifies style updates vs move-only coordinates', () => {
    assert.equal(hasStampStyleUpdate({ xPercent: 0.5, yPercent: 0.6 }), false);
    assert.equal(hasStampStyleUpdate({ widthPercent: 0.25 }), true);
    assert.equal(hasStampStyleUpdate({ rotation: 10 }), true);
    assert.equal(hasStampStyleUpdate({ opacity: 0.8 }), true);
    assert.equal(hasStampStyleUpdate({ xPercent: 0.2, brightness: 1.1 }), true);
    assert.equal(hasStampStyleUpdate(null), false);
    assert.equal(hasStampStyleUpdate(undefined), false);
});
