import { useState } from 'react';

export const useExportJob = ({ onConfirm, onClose, settings }) => {
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);
    const confirmExport = async () => {
        if (exporting) return;
        setExporting(true);
        setError(null);
        setProgress({ percent: 0, message: '正在准备页面…' });
        try {
            localStorage.setItem('exportSettings', JSON.stringify(settings));
            await onConfirm({ ...settings, onProgress: setProgress });
            onClose();
        } catch (failure) {
            setError(`导出失败：${failure.message}`);
        } finally {
            setExporting(false);
        }
    };
    return { exporting, progress, error, confirmExport };
};
