import React from 'react';
import { Check, Trash2, Undo2 } from 'lucide-react';
import { useApp } from '../context/useApp';
import { DEFAULT_WATERMARK, resolveWatermarkConfig } from '../utils/watermarkConfig.js';
import FloatingToolWindow from './FloatingToolWindow';
import WatermarkControls from './WatermarkControls';
import './scanEffect.css';

const WatermarkStatusBanner = ({ status, error, isActive, onRetry, onReset }) => {
    if (status === 'saved') {
        return (
            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2 mb-2">
                已保存水印配置（新文件与重启均复用相同参数）
            </div>
        );
    }
    if (status === 'error') {
        return (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 mb-2 flex flex-col gap-1">
                <span>保存失败：{error || '存储写入受阻'}</span>
                <button type="button" className="text-blue-600 underline text-left font-medium" onClick={onRetry}>
                    重试保存
                </button>
            </div>
        );
    }
    if (status === 'corrupt') {
        return (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mb-2 flex flex-col gap-1">
                <span>存储数据损坏（已保留原数据）：{error}</span>
                <button type="button" className="text-blue-600 underline text-left font-medium" onClick={onReset}>
                    恢复默认
                </button>
            </div>
        );
    }
    return (
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 mb-2">
            {isActive ? '水印已启用（修改将自动记忆）' : '水印未启用（保留上次调整配置）'}
        </div>
    );
};

const WatermarkFooter = ({ isActive, onApply, onRemove, onReset, onClose }) => (
    <>
        <button type="button" className="tool-secondary" onClick={onReset} title="恢复默认水印配置">
            <Undo2 size={14} />恢复默认
        </button>
        {isActive ? (
            <button type="button" className="tool-secondary" onClick={onRemove} title="移除水印（保留已编辑参数）">
                <Trash2 size={14} />移除水印
            </button>
        ) : (
            <button type="button" className="tool-primary" onClick={onApply} title="应用保存的水印到全部页面">
                <Check size={14} />应用水印
            </button>
        )}
        <button type="button" className="tool-primary" onClick={onClose}>
            完成
        </button>
    </>
);

const WatermarkTool = ({ isOpen, onClose }) => {
    const {
        watermarkConfig,
        savedWatermarkConfig,
        watermarkStatus,
        watermarkError,
        updateWatermarkConfig,
        clearWatermarkConfig,
        applyWatermark,
        resetWatermarkDefaults,
        retrySaveWatermark
    } = useApp();

    if (!isOpen) return null;

    const isActive = Boolean(watermarkConfig);
    const activeConfig = savedWatermarkConfig || DEFAULT_WATERMARK;

    return (
        <FloatingToolWindow
            title="全局水印设置"
            onClose={onClose}
            width={340}
            footer={
                <WatermarkFooter
                    isActive={isActive}
                    onApply={() => applyWatermark()}
                    onRemove={clearWatermarkConfig}
                    onReset={resetWatermarkDefaults}
                    onClose={onClose}
                />
            }
        >
            <WatermarkStatusBanner
                status={watermarkStatus}
                error={watermarkError}
                isActive={isActive}
                onRetry={retrySaveWatermark}
                onReset={resetWatermarkDefaults}
            />
            <p className="scan-hint">参数本地持久保存；跨文件保持一致，移除不会丢失参数配置。</p>
            <WatermarkControls
                config={resolveWatermarkConfig(activeConfig)}
                onChange={updateWatermarkConfig}
            />
        </FloatingToolWindow>
    );
};

export default WatermarkTool;
