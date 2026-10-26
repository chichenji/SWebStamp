import test from 'node:test';
import assert from 'node:assert/strict';
import { PreferenceSession } from './preferenceSession.js';

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
            calls.set.push({ key, val: String(val) });
            store.set(key, String(val));
        },
        removeItem: (key) => {
            calls.remove.push(key);
            store.delete(key);
        }
    };
};

const DUMMY_DEFAULTS = Object.freeze({ widthPercent: 0.18, rotation: 0 });

const dummyLoader = (storage) => {
    const raw = storage.getItem('test_pref');
    if (raw && raw.includes('CORRUPT')) {
        return { status: 'corrupt', error: 'JSON损坏', preferences: DUMMY_DEFAULTS, corruptRaw: raw };
    }
    if (raw === null) {
        return { status: 'idle', error: null, preferences: DUMMY_DEFAULTS, corruptRaw: null };
    }
    try {
        return { status: 'idle', error: null, preferences: JSON.parse(raw), corruptRaw: null };
    } catch {
        return { status: 'corrupt', error: '解析错误', preferences: DUMMY_DEFAULTS, corruptRaw: raw };
    }
};

const dummySaver = (data, storage) => {
    try {
        storage.setItem('test_pref', JSON.stringify(data));
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
};

const dummyExtractor = (current, updates) => ({ ...current, ...updates });

test('corrupt storage raw data is retained after update, keeping edits visible in memory', () => {
    const storage = createMockStorage({ test_pref: '{ CORRUPT_JSON' });
    const session = new PreferenceSession({
        storageKey: 'test_pref',
        storage,
        loadFn: dummyLoader,
        saveFn: dummySaver,
        defaultData: DUMMY_DEFAULTS,
        extractFn: dummyExtractor
    });

    assert.equal(session.status, 'corrupt');
    assert.equal(session.isCorrupt, true);

    // User makes an adjustment in memory
    const updateResult = session.update({ widthPercent: 0.35 });
    assert.equal(updateResult.ok, false);
    assert.equal(session.status, 'corrupt');
    assert.match(session.error, /保留原数据/);

    // Current in-memory edit MUST reflect the update:
    assert.equal(session.data.widthPercent, 0.35);

    // Storage setItem MUST NOT have been called; corrupt data retained:
    assert.equal(storage.store.get('test_pref'), '{ CORRUPT_JSON');
    assert.equal(storage.calls.set.length, 0);
});

test('retry on corrupt storage does not overwrite raw data', () => {
    const storage = createMockStorage({ test_pref: '{ CORRUPT_JSON' });
    const session = new PreferenceSession({
        storageKey: 'test_pref',
        storage,
        loadFn: dummyLoader,
        saveFn: dummySaver,
        defaultData: DUMMY_DEFAULTS,
        extractFn: dummyExtractor
    });

    session.update({ widthPercent: 0.5 });
    const retryResult = session.retry();

    assert.equal(retryResult.ok, false);
    assert.equal(session.status, 'corrupt');
    assert.equal(storage.store.get('test_pref'), '{ CORRUPT_JSON');
    assert.equal(storage.calls.set.length, 0);
});

test('only explicit reset replaces corrupt storage with clean defaults', () => {
    const storage = createMockStorage({ test_pref: '{ CORRUPT_JSON' });
    const session = new PreferenceSession({
        storageKey: 'test_pref',
        storage,
        loadFn: dummyLoader,
        saveFn: dummySaver,
        defaultData: DUMMY_DEFAULTS,
        extractFn: dummyExtractor
    });

    const resetResult = session.reset();
    assert.equal(resetResult.ok, true);
    assert.equal(session.status, 'saved');
    assert.equal(session.isCorrupt, false);
    assert.deepEqual(session.data, DUMMY_DEFAULTS);

    // Now storage contains clean defaults:
    assert.deepEqual(JSON.parse(storage.store.get('test_pref')), DUMMY_DEFAULTS);

    // Subsequent updates now save cleanly:
    const updateResult = session.update({ widthPercent: 0.22 });
    assert.equal(updateResult.ok, true);
    assert.equal(session.status, 'saved');
    assert.equal(JSON.parse(storage.store.get('test_pref')).widthPercent, 0.22);
});

test('initial read denied exposes real error and does not silently write over storage', () => {
    const deniedLoader = () => ({
        status: 'error',
        error: 'SecurityError: storage access denied',
        preferences: DUMMY_DEFAULTS,
        corruptRaw: null
    });
    const storage = createMockStorage({ test_pref: '{"sensitive":"data"}' });

    const session = new PreferenceSession({
        storageKey: 'test_pref',
        storage,
        loadFn: deniedLoader,
        saveFn: dummySaver,
        defaultData: DUMMY_DEFAULTS,
        extractFn: dummyExtractor
    });

    assert.equal(session.status, 'error');
    assert.match(session.error, /SecurityError/);

    // Adjusting does not overwrite unread record
    const result = session.update({ widthPercent: 0.3 });
    assert.equal(result.ok, false);
    assert.equal(storage.calls.set.length, 0);
    assert.equal(storage.store.get('test_pref'), '{"sensitive":"data"}');
});

test('synchronous same-tick updates preserve all field updates without loss', () => {
    const storage = createMockStorage();
    const session = new PreferenceSession({
        storageKey: 'test_pref',
        storage,
        loadFn: dummyLoader,
        saveFn: dummySaver,
        defaultData: DUMMY_DEFAULTS,
        extractFn: dummyExtractor
    });

    // Two updates in same tick
    session.update({ widthPercent: 0.28 });
    session.update({ rotation: 45 });

    assert.equal(session.data.widthPercent, 0.28);
    assert.equal(session.data.rotation, 45);

    const stored = JSON.parse(storage.store.get('test_pref'));
    assert.equal(stored.widthPercent, 0.28);
    assert.equal(stored.rotation, 45);
});

test('handles quota error and allows retry when storage recovers', () => {
    let fail = true;
    const storage = {
        getItem: () => null,
        setItem: () => {
            if (fail) throw new Error('QuotaExceeded');
        },
        removeItem: () => {}
    };

    const session = new PreferenceSession({
        storageKey: 'test_pref',
        storage,
        loadFn: dummyLoader,
        saveFn: dummySaver,
        defaultData: DUMMY_DEFAULTS,
        extractFn: dummyExtractor
    });

    const res1 = session.update({ widthPercent: 0.4 });
    assert.equal(res1.ok, false);
    assert.equal(session.status, 'error');
    assert.equal(session.data.widthPercent, 0.4); // edit retained in memory

    // Storage recovers
    fail = false;
    const res2 = session.retry();
    assert.equal(res2.ok, true);
    assert.equal(session.status, 'saved');
});

test('regression: initial read-error then retry sees corrupt retains raw without writing', () => {
    let mode = 'error';
    const storage = createMockStorage({ test_pref: '{ CORRUPT_RAW_DATA' });

    const dynamicLoader = (s) => {
        if (mode === 'error') {
            return { status: 'error', error: 'Initial read denied', preferences: DUMMY_DEFAULTS, corruptRaw: null };
        }
        return dummyLoader(s);
    };

    const session = new PreferenceSession({
        storageKey: 'test_pref',
        storage,
        loadFn: dynamicLoader,
        saveFn: dummySaver,
        defaultData: DUMMY_DEFAULTS,
        extractFn: dummyExtractor
    });

    assert.equal(session.status, 'error');
    assert.equal(session.readDenied, true);

    // Permission recovers, but storage data is corrupt
    mode = 'corrupt';
    const retryResult = session.retry();

    assert.equal(retryResult.ok, false);
    assert.equal(session.status, 'corrupt');
    assert.equal(session.isCorrupt, true);
    assert.match(session.error, /JSON损坏/);

    // Writes MUST remain 0, raw corrupt data preserved:
    assert.equal(storage.calls.set.length, 0);
    assert.equal(storage.store.get('test_pref'), '{ CORRUPT_RAW_DATA');

    // Explicit reset clears corrupt and saves clean defaults
    const resetResult = session.reset();
    assert.equal(resetResult.ok, true);
    assert.equal(session.status, 'saved');
    assert.equal(storage.calls.set.length, 1);
    assert.deepEqual(JSON.parse(storage.store.get('test_pref')), DUMMY_DEFAULTS);
});
