import { useCallback, useEffect, useMemo, useState } from 'react';

const loadSavedStamps = () => {
    const saved = localStorage.getItem('webpdf_stamps');
    if (!saved) return [];
    try { return JSON.parse(saved); }
    catch (error) { console.error('Failed to load stamps from localStorage', error); return []; }
};
const readStampFile = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve({ id: `stamp-${crypto.randomUUID()}`, name: file.name,
        url: event.target.result, created_at: new Date().toISOString() });
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
});

export const useStampLibrary = () => {
    const [stamps, setStamps] = useState(loadSavedStamps);
    useEffect(() => { localStorage.setItem('webpdf_stamps', JSON.stringify(stamps)); }, [stamps]);
    const addStamp = useCallback(stamp => setStamps(previous => [...previous, stamp]), []);
    const uploadStamp = useCallback(async file => {
        try {
            const stamp = await readStampFile(file);
            addStamp(stamp);
            return { success: true, stamp };
        } catch (error) { return { success: false, error: error.message }; }
    }, [addStamp]);
    const deleteStamp = useCallback(async id => {
        setStamps(previous => previous.filter(stamp => stamp.id !== id));
        return { success: true };
    }, []);
    return { stamps, addStamp, uploadStamp, deleteStamp };
};

export const usePlacedStamps = () => {
    const [placedStamps, setPlacedStamps] = useState({});
    const [selectedPlacedStamp, setSelectedPlacedStamp] = useState(null);
    const addPlacedStamp = useCallback((docId, stamp) => {
        setPlacedStamps(previous => ({ ...previous, [docId]: [...(previous[docId] || []), stamp] }));
        setSelectedPlacedStamp({ docId, stampId: stamp.id });
    }, []);
    const removePlacedStamp = useCallback((docId, stampId) => {
        setPlacedStamps(previous => ({ ...previous, [docId]: (previous[docId] || []).filter(s => s.id !== stampId) }));
        setSelectedPlacedStamp(previous => previous?.docId === docId && previous.stampId === stampId ? null : previous);
    }, []);
    const updatePlacedStamp = useCallback((docId, stampId, updates) => {
        setPlacedStamps(previous => ({ ...previous,
            [docId]: (previous[docId] || []).map(stamp => stamp.id === stampId ? { ...stamp, ...updates } : stamp) }));
    }, []);
    const clearDocumentStamps = useCallback(docId => {
        setPlacedStamps(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== docId)));
        setSelectedPlacedStamp(previous => previous?.docId === docId ? null : previous);
    }, []);
    const selectedStamp = useMemo(() => selectedPlacedStamp
        ? placedStamps[selectedPlacedStamp.docId]?.find(stamp => stamp.id === selectedPlacedStamp.stampId) ?? null
        : null, [placedStamps, selectedPlacedStamp]);
    return { placedStamps, selectedPlacedStamp, setSelectedPlacedStamp, selectedStamp,
        addPlacedStamp, removePlacedStamp, updatePlacedStamp, clearDocumentStamps };
};
