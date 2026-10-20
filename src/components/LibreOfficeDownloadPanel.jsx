import React from 'react';
import { AlertCircle, CheckCircle2, Download, Loader2, X } from 'lucide-react';

const ProgressState = ({ status }) => (
    <div className="space-y-2">
        <div className="w-full bg-amber-200 rounded-full h-2.5 overflow-hidden">
            <div
                className="bg-amber-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${status.progress || 0}%` }}
            />
        </div>
        <p className="text-xs text-amber-700 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            {status.message || '正在处理...'}
        </p>
    </div>
);

const ErrorState = ({ error, onRetry }) => (
    <div className="space-y-2">
        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-100 border border-red-200">
            <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-red-700">{error}</span>
        </div>
        <button type="button" onClick={onRetry} className="text-xs text-amber-700 font-medium underline">
            重试下载
        </button>
    </div>
);

const DownloadState = ({ status, onRetry }) => {
    if (!status) return null;
    if (status.status === 'downloading' || status.status === 'extracting') {
        return <ProgressState status={status} />;
    }
    if (status.status === 'done') {
        return (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100 border border-green-200">
                <CheckCircle2 size={16} className="text-green-600" />
                <span className="text-sm text-green-700 font-medium">{status.message || '安装完成，正在处理文件...'}</span>
            </div>
        );
    }
    if (status.status === 'error') return <ErrorState error={status.error} onRetry={onRetry} />;
    return null;
};

const canStartDownload = (status) => !status || status.status === 'idle' || status.status === 'error';

const LibreOfficeDownloadPanel = ({ pendingCount, status, onClose, onStart }) => (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3">
        <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600 mt-0.5"><Download size={18} /></div>
                <div>
                    <h4 className="text-sm font-bold text-amber-900">需要 LibreOffice 转换引擎</h4>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        首次导入 Office 文档需要下载约 350MB，完成后将继续转换 {pendingCount} 个文件。
                    </p>
                </div>
            </div>
            {canStartDownload(status) && (
                <button type="button" onClick={onClose} className="text-amber-500 p-1" title="关闭">
                    <X size={14} />
                </button>
            )}
        </div>
        <DownloadState status={status} onRetry={onStart} />
        {canStartDownload(status) && (
            <button
                type="button"
                onClick={onStart}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
            >
                <Download size={16} /> 开始下载 LibreOffice
            </button>
        )}
    </div>
);

export default LibreOfficeDownloadPanel;
