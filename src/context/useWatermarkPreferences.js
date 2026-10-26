import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_WATERMARK } from '../utils/watermarkConfig.js';
import {
    cleanWatermarkConfig,
    loadWatermarkPreferences,
    saveWatermarkPreferencesToStorage
} from '../utils/watermarkPreferences.js';
import { PreferenceSession } from '../utils/preferenceSession.js';

export const useWatermarkPreferences = (storage) => {
    const [session] = useState(() => new PreferenceSession({
        storageKey: 'webpdf_watermark_preferences_v1',
        storage,
        loadFn: loadWatermarkPreferences,
        saveFn: (payload, targetStorage) => saveWatermarkPreferencesToStorage(payload, targetStorage),
        defaultData: DEFAULT_WATERMARK,
        extractFn: (current, updates) => cleanWatermarkConfig({ ...current, ...updates }),
        preparePayload: (config, enabled) => ({ enabled, config })
    }));

    const [state, setState] = useState(() => session.getState());

    useEffect(() => session.subscribe(() => setState(session.getState())), [session]);

    const updateWatermarkConfig = useCallback((updates) => {
        session.update(updates);
    }, [session]);

    const applyWatermark = useCallback((explicit) => {
        if (explicit) session.update(explicit);
        session.setEnabled(true);
    }, [session]);

    const clearWatermarkConfig = useCallback(() => {
        session.setEnabled(false);
    }, [session]);

    const resetWatermarkDefaults = useCallback(() => {
        session.reset({ enabled: session.enabled });
    }, [session]);

    const retrySaveWatermark = useCallback(() => {
        session.retry();
    }, [session]);

    return {
        watermarkConfig: state.enabled ? state.data : null,
        savedWatermarkConfig: state.data,
        watermarkStatus: state.status,
        watermarkError: state.error,
        updateWatermarkConfig,
        clearWatermarkConfig,
        applyWatermark,
        resetWatermarkDefaults,
        retrySaveWatermark
    };
};
