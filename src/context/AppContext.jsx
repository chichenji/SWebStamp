import React, { useCallback, useState } from 'react';
import { AppContext } from './appContextValue.js';
import { useScanSettings } from './useScanSettings.js';
import { useStampLibrary, usePlacedStamps } from './useStampState.js';
import { useDocumentLayers } from './useDocumentLayers.js';

export const AppProvider = ({ children }) => {
    const [documents, setDocuments] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const scanSettings = useScanSettings();
    const stampLibrary = useStampLibrary();
    const stampState = usePlacedStamps();
    const documentLayers = useDocumentLayers();
    const { setActiveDocumentId } = scanSettings;
    const addDocuments = useCallback(newDocs => {
        setDocuments(previous => [...previous, ...newDocs]);
        setActiveDocumentId(previous => previous ?? newDocs[0]?.id ?? null);
    }, [setActiveDocumentId]);
    const reorderDocuments = useCallback(newDocs => setDocuments(newDocs), []);
    const removeDocument = id => {
        if (scanSettings.activeDocumentId === id) {
            const index = documents.findIndex(doc => doc.id === id);
            setActiveDocumentId(documents[index + 1]?.id ?? documents[index - 1]?.id ?? null);
        }
        setDocuments(previous => previous.filter(doc => doc.id !== id));
        stampState.clearDocumentStamps(id);
        scanSettings.removeScanConfig(id);
    };
    return <AppContext.Provider value={{ documents, addDocuments, removeDocument, reorderDocuments,
        isProcessing, setIsProcessing, ...scanSettings, ...stampLibrary, ...stampState, ...documentLayers }}>
        {children}
    </AppContext.Provider>;
};
