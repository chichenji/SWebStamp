import React, { useCallback, useState } from 'react';
import { AppContext } from './appContextValue.js';
import { useScanSettings } from './useScanSettings.js';
import { useStampLibrary, usePlacedStamps } from './useStampState.js';
import { useDocumentLayers } from './useDocumentLayers.js';
import { useImageAdjustments } from './useImageAdjustments.js';
import { useStampPreferences } from './useStampPreferences.js';

const useDocumentList = ({ scanSettings, stampState }) => {
    const [documents, setDocuments] = useState([]);
    const { setActiveDocumentId } = scanSettings;

    const addDocuments = useCallback(newDocs => {
        setDocuments(previous => [...previous, ...newDocs]);
        setActiveDocumentId(previous => previous ?? newDocs[0]?.id ?? null);
    }, [setActiveDocumentId]);

    const removeDocument = (id) => {
        if (scanSettings.activeDocumentId === id) {
            const index = documents.findIndex(doc => doc.id === id);
            setActiveDocumentId(documents[index + 1]?.id ?? documents[index - 1]?.id ?? null);
        }
        setDocuments(previous => previous.filter(doc => doc.id !== id));
        stampState.clearDocumentStamps(id);
        scanSettings.removeScanConfig(id);
    };

    return { documents, setDocuments, addDocuments, removeDocument };
};

const resolvePreferenceUpdates = (updates, requestedWidth) => {
    const preferenceUpdates = { ...updates };
    delete preferenceUpdates.requestedWidthPercent;
    if (typeof requestedWidth === 'number' && Number.isFinite(requestedWidth)) {
        preferenceUpdates.widthPercent = requestedWidth;
    }
    return preferenceUpdates;
};

const useStampUpdateHandler = (setPlacedStampUpdate, updateStampPreferences) => useCallback((docId, stampId, updates) => {
    if (!updates || typeof updates !== 'object') return;
    const { requestedWidthPercent, ...placedUpdates } = updates;
    setPlacedStampUpdate(docId, stampId, placedUpdates);
    updateStampPreferences(resolvePreferenceUpdates(updates, requestedWidthPercent));
}, [setPlacedStampUpdate, updateStampPreferences]);

export const AppProvider = ({ children }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const scanSettings = useScanSettings();
    const stampLibrary = useStampLibrary();
    const stampState = usePlacedStamps();
    const documentLayers = useDocumentLayers();
    const stampPreferencesHook = useStampPreferences();

    const { documents, setDocuments, addDocuments, removeDocument } = useDocumentList({
        scanSettings,
        stampState
    });

    const imageAdjustments = useImageAdjustments({
        documents,
        setDocuments,
        activeDocumentId: scanSettings.activeDocumentId,
        setCompareOriginal: scanSettings.setCompareOriginal
    });

    const updatePlacedStamp = useStampUpdateHandler(
        stampState.updatePlacedStamp,
        stampPreferencesHook.updateStampPreferences
    );

    return (
        <AppContext.Provider value={{
            documents,
            addDocuments,
            removeDocument,
            reorderDocuments: setDocuments,
            isProcessing,
            setIsProcessing,
            ...scanSettings,
            ...stampLibrary,
            ...stampState,
            updatePlacedStamp,
            ...documentLayers,
            ...imageAdjustments,
            ...stampPreferencesHook
        }}>
            {children}
        </AppContext.Provider>
    );
};
