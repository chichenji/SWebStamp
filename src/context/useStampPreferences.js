import { useCallback, useEffect, useState } from 'react';
import {
    DEFAULT_STAMP_PREFERENCES,
    extractStampPreferences,
    loadStampPreferences,
    saveStampPreferencesToStorage
} from '../utils/stampPreferences.js';
import { PreferenceSession } from '../utils/preferenceSession.js';

const STAMP_STYLE_KEYS = new Set([
    'widthPercent', 'rotation', 'opacity', 'brightness',
    'contrast', 'saturation', 'blendMode'
]);

export const hasStampStyleUpdate = (updates) => {
    if (!updates || typeof updates !== 'object') return false;
    return Object.keys(updates).some(key => STAMP_STYLE_KEYS.has(key));
};

export const useStampPreferences = (storage) => {
    const [session] = useState(() => new PreferenceSession({
        storageKey: 'webpdf_stamp_preferences_v1',
        storage,
        loadFn: loadStampPreferences,
        saveFn: (settings, targetStorage) => saveStampPreferencesToStorage(settings, targetStorage),
        defaultData: DEFAULT_STAMP_PREFERENCES,
        extractFn: (current, updates) => extractStampPreferences(updates, current)
    }));

    const [state, setState] = useState(() => session.getState());

    useEffect(() => session.subscribe(() => setState(session.getState())), [session]);

    const updateStampPreferences = useCallback((updates) => {
        if (!hasStampStyleUpdate(updates)) return;
        session.update(updates);
    }, [session]);

    const resetStampPreferences = useCallback(() => {
        session.reset();
    }, [session]);

    const retrySaveStampPreferences = useCallback(() => {
        session.retry();
    }, [session]);

    return {
        stampPreferences: state.data,
        stampPreferencesStatus: state.status,
        stampPreferencesError: state.error,
        updateStampPreferences,
        resetStampPreferences,
        retrySaveStampPreferences
    };
};
