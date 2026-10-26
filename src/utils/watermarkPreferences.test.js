import test from 'node:test';
import assert from 'node:assert/strict';
import {
    WATERMARK_PREFERENCES_KEY,
    loadWatermarkPreferences,
    saveWatermarkPreferencesToStorage,
    validateWatermarkPreferencesSchema
} from './watermarkPreferences.js';
import { DEFAULT_WATERMARK } from './watermarkConfig.js';

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

test('clean launch returns default watermark with enabled=false without writing to storage', () => {
    const storage = createMockStorage();
    const result = loadWatermarkPreferences(storage);

    assert.equal(result.status, 'idle');
    assert.equal(result.enabled, false);
    assert.deepEqual(result.config, DEFAULT_WATERMARK);
    assert.equal(storage.calls.set.length, 0);
    assert.equal(storage.store.size, 0);
});

test('roundtrip persists full watermark config including image dataURL and active state', () => {
    const storage = createMockStorage();
    const customConfig = {
        type: 'image',
        text: '机密文件',
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        layout: 'array',
        opacity: 0.35,
        angle: -30,
        density: 2.0,
        color: '#ff0000',
        fontSize: 48,
        positionX: 40,
        positionY: 60
    };

    const saveResult = saveWatermarkPreferencesToStorage({ enabled: true, config: customConfig }, storage);
    assert.equal(saveResult.ok, true);

    const loaded = loadWatermarkPreferences(storage);
    assert.equal(loaded.status, 'idle');
    assert.equal(loaded.enabled, true);
    assert.deepEqual(loaded.config, customConfig);
});

test('remove disables watermark without losing last edits, and reapply restores it', () => {
    const storage = createMockStorage();
    const editedConfig = {
        ...DEFAULT_WATERMARK,
        text: '内部审阅专用',
        angle: 45,
        opacity: 0.25
    };

    // User applies watermark
    saveWatermarkPreferencesToStorage({ enabled: true, config: editedConfig }, storage);
    const step1 = loadWatermarkPreferences(storage);
    assert.equal(step1.enabled, true);
    assert.equal(step1.config.text, '内部审阅专用');

    // User removes watermark: it becomes disabled, but config is NOT lost!
    saveWatermarkPreferencesToStorage({ enabled: false, config: editedConfig }, storage);
    const step2 = loadWatermarkPreferences(storage);
    assert.equal(step2.enabled, false);
    assert.equal(step2.config.text, '内部审阅专用');
    assert.equal(step2.config.angle, 45);

    // User reapplies watermark: re-enabled with same saved config
    saveWatermarkPreferencesToStorage({ enabled: true, config: step2.config }, storage);
    const step3 = loadWatermarkPreferences(storage);
    assert.equal(step3.enabled, true);
    assert.equal(step3.config.text, '内部审阅专用');
});

test('explicit reset restores DEFAULT_WATERMARK', () => {
    const storage = createMockStorage();
    saveWatermarkPreferencesToStorage({
        enabled: true,
        config: { ...DEFAULT_WATERMARK, text: '旧配置', angle: 90 }
    }, storage);

    // Reset restores defaults
    saveWatermarkPreferencesToStorage({ enabled: false, config: DEFAULT_WATERMARK }, storage);
    const result = loadWatermarkPreferences(storage);
    assert.equal(result.enabled, false);
    assert.deepEqual(result.config, DEFAULT_WATERMARK);
});

test('corrupt storage data is preserved intact on read and exposes corrupt status', () => {
    const storage = createMockStorage({
        [WATERMARK_PREFERENCES_KEY]: '{"version":1,"enabled":"not-a-bool"}'
    });

    const result = loadWatermarkPreferences(storage);
    assert.equal(result.status, 'corrupt');
    assert.equal(result.enabled, false);
    assert.deepEqual(result.config, DEFAULT_WATERMARK);
    // Storage must NOT be altered or cleared on read:
    assert.equal(storage.store.get(WATERMARK_PREFERENCES_KEY), '{"version":1,"enabled":"not-a-bool"}');
    assert.equal(storage.calls.set.length, 0);
    assert.equal(storage.calls.remove.length, 0);
});

test('quota write failure exposes error, retains config, and retry succeeds', () => {
    let failWrite = true;
    const store = new Map();
    const storage = {
        getItem: () => null,
        setItem: (key, val) => {
            if (failWrite) {
                const err = new Error('QuotaExceeded');
                err.name = 'QuotaExceededError';
                throw err;
            }
            store.set(key, val);
        },
        removeItem: () => {}
    };

    const bigConfig = {
        ...DEFAULT_WATERMARK,
        type: 'image',
        imageUrl: 'data:image/png;base64,' + 'A'.repeat(5000)
    };

    const write1 = saveWatermarkPreferencesToStorage({ enabled: true, config: bigConfig }, storage);
    assert.equal(write1.ok, false);
    assert.match(write1.error, /存储空间不足/);

    // Storage recovers, retry succeeds
    failWrite = false;
    const write2 = saveWatermarkPreferencesToStorage({ enabled: true, config: bigConfig }, storage);
    assert.equal(write2.ok, true);
    assert.ok(store.has(WATERMARK_PREFERENCES_KEY));
});

test('never persists document coordinates or placed stamp references in watermark storage', () => {
    const storage = createMockStorage();
    const configWithSneakyProps = {
        ...DEFAULT_WATERMARK,
        docId: 'doc-999',
        placedStamps: [{ id: 'stamp-1', xPercent: 0.1 }],
        pageCoords: { x: 10, y: 20 }
    };

    saveWatermarkPreferencesToStorage({ enabled: true, config: configWithSneakyProps }, storage);
    const raw = storage.store.get(WATERMARK_PREFERENCES_KEY);
    const parsed = JSON.parse(raw);

    assert.equal(parsed.config.docId, undefined);
    assert.equal(parsed.config.placedStamps, undefined);
    assert.equal(parsed.config.pageCoords, undefined);
});

test('watermark schema rejects missing fields instead of silently repairing with defaults', () => {
    // Missing angle
    const withoutAngle = { ...DEFAULT_WATERMARK };
    delete withoutAngle.angle;
    const res1 = validateWatermarkPreferencesSchema({ version: 1, enabled: true, config: withoutAngle });
    assert.equal(res1.valid, false);
    assert.match(res1.error, /angle|倾斜角度/);

    // Missing fontSize
    const withoutFont = { ...DEFAULT_WATERMARK };
    delete withoutFont.fontSize;
    const res2 = validateWatermarkPreferencesSchema({ version: 1, enabled: true, config: withoutFont });
    assert.equal(res2.valid, false);
    assert.match(res2.error, /fontSize|字号/);
});

test('watermark schema rejects invalid color and external imageUrls', () => {
    // Invalid color
    const badColor = { ...DEFAULT_WATERMARK, color: 'rgb(255,0,0)' };
    const res1 = validateWatermarkPreferencesSchema({ version: 1, enabled: true, config: badColor });
    assert.equal(res1.valid, false);
    assert.match(res1.error, /color|颜色/);

    // External http imageUrl
    const externalImg = { ...DEFAULT_WATERMARK, type: 'image', imageUrl: 'https://example.com/malicious.png' };
    const res2 = validateWatermarkPreferencesSchema({ version: 1, enabled: true, config: externalImg });
    assert.equal(res2.valid, false);
    assert.match(res2.error, /imageUrl|图片/);
});

test('strips unknown fields on valid read as well as write', () => {
    const storage = createMockStorage({
        [WATERMARK_PREFERENCES_KEY]: JSON.stringify({
            version: 1,
            enabled: true,
            config: {
                ...DEFAULT_WATERMARK,
                forbiddenField: 'sneaky-data'
            }
        })
    });

    const result = loadWatermarkPreferences(storage);
    assert.equal(result.status, 'idle');
    assert.equal(result.config.forbiddenField, undefined);
});

test('saveWatermarkPreferencesToStorage rejects non-boolean enabled without coercing', () => {
    const storage = createMockStorage();
    const result = saveWatermarkPreferencesToStorage({ enabled: 'true', config: DEFAULT_WATERMARK }, storage);
    assert.equal(result.ok, false);
    assert.match(result.error, /布尔值/);
    assert.equal(storage.calls.set.length, 0);
});

test('allows large density and fontSize without arbitrary caps', () => {
    const customConfig = {
        ...DEFAULT_WATERMARK,
        density: 15.0,
        fontSize: 750
    };
    const storage = createMockStorage();
    const result = saveWatermarkPreferencesToStorage({ enabled: true, config: customConfig }, storage);
    assert.equal(result.ok, true);

    const loaded = loadWatermarkPreferences(storage);
    assert.equal(loaded.config.density, 15.0);
    assert.equal(loaded.config.fontSize, 750);
});
