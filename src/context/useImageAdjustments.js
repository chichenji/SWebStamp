import { useCallback, useMemo, useState } from 'react';
import {
    DEFAULT_IMAGE_ADJUSTMENTS,
    applyImageAdjustmentsToDocuments,
    getImageAdjustments,
    resetDocumentsImageAdjustments
} from '../utils/imageAdjustment.js';

export const useImageAdjustments = ({ documents, setDocuments, activeDocumentId, setCompareOriginal }) => {
    const [imageAdjustmentScope, setImageAdjustmentScope] = useState('page');

    const activeDocument = useMemo(() => {
        if (!activeDocumentId) return null;
        return documents.find(doc => doc.id === activeDocumentId) ?? null;
    }, [documents, activeDocumentId]);

    const activeImageAdjustments = useMemo(() => (
        getImageAdjustments(activeDocument)
    ), [activeDocument]);

    const updateImageAdjustments = useCallback((updates, overrideScope) => {
        const scope = overrideScope ?? imageAdjustmentScope;
        if (scope === 'page' && !activeDocumentId) return;
        setDocuments(previous => applyImageAdjustmentsToDocuments({
            documents: previous,
            targetId: activeDocumentId,
            scope,
            updates
        }));
    }, [activeDocumentId, imageAdjustmentScope, setDocuments]);

    const resetImageAdjustments = useCallback((overrideScope) => {
        const scope = overrideScope ?? imageAdjustmentScope;
        if (scope === 'page' && !activeDocumentId) return;
        setDocuments(previous => resetDocumentsImageAdjustments({
            documents: previous,
            targetId: activeDocumentId,
            scope
        }));
        setCompareOriginal?.(false);
    }, [activeDocumentId, imageAdjustmentScope, setDocuments, setCompareOriginal]);

    return {
        imageAdjustmentScope,
        setImageAdjustmentScope,
        activeImageAdjustments,
        updateImageAdjustments,
        resetImageAdjustments
    };
};
