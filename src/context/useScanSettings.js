import { useCallback, useState } from 'react';
import { createScanConfig, normalizeScanConfig } from '../utils/scanEffect/scanConstants.js';

export const useScanSettings = () => {
    const [activeDocumentId, setActiveDocumentId] = useState(null);
    const [scanScope, setScanScope] = useState('all');
    const [compareOriginal, setCompareOriginal] = useState(false);
    const [settings, setSettings] = useState(() => ({ all: createScanConfig(), pages: {} }));
    const getPageScanConfig = useCallback(id => settings.pages[id] ?? settings.all, [settings]);
    const scanConfig = getPageScanConfig(activeDocumentId);
    const updateScanConfig = useCallback(updates => {
        setSettings(previous => {
            const current = previous.pages[activeDocumentId] ?? previous.all;
            const next = normalizeScanConfig({ ...current, ...updates });
            if (scanScope === 'all') return { all: next, pages: {} };
            if (!activeDocumentId) return previous;
            return { ...previous, pages: { ...previous.pages, [activeDocumentId]: next } };
        });
    }, [activeDocumentId, scanScope]);
    const resetScanConfig = () => {
        updateScanConfig(createScanConfig({ enabled: scanConfig.enabled }));
        setCompareOriginal(false);
    };
    const removeScanConfig = id => setSettings(previous => ({ ...previous,
        pages: Object.fromEntries(Object.entries(previous.pages).filter(([pageId]) => pageId !== id)) }));
    return { activeDocumentId, setActiveDocumentId, scanScope, setScanScope,
        compareOriginal, setCompareOriginal, scanConfig, updateScanConfig, resetScanConfig, getPageScanConfig, removeScanConfig };
};
