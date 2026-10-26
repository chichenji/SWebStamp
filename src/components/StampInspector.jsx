import React from 'react';
import { RotateCcw, SlidersHorizontal, Trash2, Undo2 } from 'lucide-react';
import { useApp } from '../context/useApp';
import { REALISTIC_STAMP_PRESET, normalizeStampAppearance } from '../utils/stampAppearance';
import { DEFAULT_STAMP_PREFERENCES } from '../utils/stampPreferences';
import { calculateInspectorStampSize } from '../utils/stampPlacement';
import StampAppearanceControls from './StampAppearanceControls';

const RangeControl = ({ config, value, onChange }) => (
    <label className="stamp-range-control">
        <span className="stamp-range-label">
            <span>{config.label}</span>
            <output>{config.format(value)}</output>
        </span>
        <input
            aria-label={config.label}
            type="range"
            min={config.min}
            max={config.max}
            step={config.step}
            value={value}
            onChange={event => onChange(Number(event.target.value))}
        />
    </label>
);

const EmptyInspector = () => (
    <div className="inspector-empty">
        <SlidersHorizontal size={26} />
        <strong>未选择印章</strong>
        <span>属性将在这里显示</span>
    </div>
);

const StampPersistenceStatus = ({ status, error, onRetry, onReset }) => {
    if (status === 'saved') {
        return (
            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                已保存全局样式（新印章将复用此大小与外观）
            </div>
        );
    }
    if (status === 'error') {
        return (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 flex flex-col gap-1">
                <span>保存失败：{error || '存储写入受阻'}</span>
                <button type="button" className="text-blue-600 underline text-left font-medium" onClick={onRetry}>
                    重试保存
                </button>
            </div>
        );
    }
    if (status === 'corrupt') {
        return (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 flex flex-col gap-1">
                <span>本地存储数据损坏（已保留原数据）：{error}</span>
                <button type="button" className="text-blue-600 underline text-left font-medium" onClick={onReset}>
                    重置为默认
                </button>
            </div>
        );
    }
    return (
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2">
            全局样式已就绪（调整印章后自动记忆默认参数）
        </div>
    );
};

const StampInspectorPreview = ({ stamp, globalWidthPercent }) => {
    const isConstrained = typeof globalWidthPercent === 'number'
        && Math.abs(stamp.widthPercent - globalWidthPercent) > 0.005;

    return (
        <div className="inspector-preview">
            <img src={stamp.url} alt="当前印章" />
            <div>
                <strong>印章属性</strong>
                {isConstrained ? (
                    <span>
                        全局大小 {Math.round(globalWidthPercent * 100)}%，当前页面等比适配 {Math.round(stamp.widthPercent * 100)}%
                    </span>
                ) : (
                    <span>{Math.round(stamp.widthPercent * 100)}% 页面宽度</span>
                )}
            </div>
        </div>
    );
};

const StampInspectorControls = ({ stamp, appearance, globalWidthPercent, onSize, onAppearance, onRotation }) => {
    const sliderValue = (typeof globalWidthPercent === 'number' && Math.abs(stamp.widthPercent - globalWidthPercent) > 0.005)
        ? globalWidthPercent
        : stamp.widthPercent;

    return (
        <section className="inspector-section inspector-ranges">
            <RangeControl
                config={{ label: '大小', min: 0.05, max: 0.8, step: 0.01, format: v => `${Math.round(v * 100)}%` }}
                value={sliderValue}
                onChange={onSize}
            />
            <StampAppearanceControls value={appearance} onChange={onAppearance} />
            <RangeControl
                config={{ label: '角度', min: -180, max: 180, step: 1, format: v => `${Math.round(v)}°` }}
                value={stamp.rotation || 0}
                onChange={onRotation}
            />
        </section>
    );
};

const StampInspectorActions = ({ onRealistic, onRestoreDefault, onDelete }) => (
    <div className="inspector-actions" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
        <button type="button" onClick={onRealistic} title="真实印章质感">
            <RotateCcw size={14} /> 真实印章
        </button>
        <button type="button" onClick={onRestoreDefault} title="恢复默认样式并更新全局记忆">
            <Undo2 size={14} /> 恢复默认
        </button>
        <button type="button" className="danger" onClick={onDelete} title="删除当前印章">
            <Trash2 size={14} /> 删除
        </button>
    </div>
);

const getStampInspectorHandlers = ({ selectedPlacedStamp, selectedStamp, updatePlacedStamp, resetStampPreferences }) => {
    const appearance = normalizeStampAppearance(selectedStamp);
    const updateSize = (requestedWidth) => {
        const fit = calculateInspectorStampSize({ stamp: selectedStamp, requestedWidth });
        updatePlacedStamp(selectedPlacedStamp.docId, selectedPlacedStamp.stampId, {
            widthPercent: fit.widthPercent,
            heightPercent: fit.heightPercent,
            xPercent: fit.xPercent,
            yPercent: fit.yPercent,
            requestedWidthPercent: requestedWidth
        });
    };
    const handleRestoreDefault = () => {
        resetStampPreferences();
        const defaultWidth = DEFAULT_STAMP_PREFERENCES.widthPercent;
        const fit = calculateInspectorStampSize({ stamp: selectedStamp, requestedWidth: defaultWidth });
        updatePlacedStamp(selectedPlacedStamp.docId, selectedPlacedStamp.stampId, {
            ...DEFAULT_STAMP_PREFERENCES,
            widthPercent: fit.widthPercent,
            heightPercent: fit.heightPercent,
            xPercent: fit.xPercent,
            yPercent: fit.yPercent,
            requestedWidthPercent: defaultWidth
        });
    };
    return { appearance, updateSize, handleRestoreDefault };
};

const StampInspector = () => {
    const {
        selectedPlacedStamp, selectedStamp, updatePlacedStamp, removePlacedStamp,
        stampPreferences, stampPreferencesStatus, stampPreferencesError,
        resetStampPreferences, retrySaveStampPreferences
    } = useApp();

    if (!selectedPlacedStamp || !selectedStamp) return <EmptyInspector />;

    const globalWidthPercent = stampPreferences?.widthPercent ?? DEFAULT_STAMP_PREFERENCES.widthPercent;
    const { appearance, updateSize, handleRestoreDefault } = getStampInspectorHandlers({
        selectedPlacedStamp, selectedStamp, updatePlacedStamp, resetStampPreferences
    });

    return (
        <div className="stamp-inspector">
            <StampInspectorPreview stamp={selectedStamp} globalWidthPercent={globalWidthPercent} />
            <StampPersistenceStatus
                status={stampPreferencesStatus}
                error={stampPreferencesError}
                onRetry={retrySaveStampPreferences}
                onReset={handleRestoreDefault}
            />
            <StampInspectorControls
                stamp={selectedStamp}
                appearance={appearance}
                globalWidthPercent={globalWidthPercent}
                onSize={updateSize}
                onAppearance={(updates) => updatePlacedStamp(
                    selectedPlacedStamp.docId, selectedPlacedStamp.stampId,
                    normalizeStampAppearance({ ...appearance, ...updates })
                )}
                onRotation={(rotation) => updatePlacedStamp(
                    selectedPlacedStamp.docId, selectedPlacedStamp.stampId, { rotation }
                )}
            />
            <StampInspectorActions
                onRealistic={() => updatePlacedStamp(
                    selectedPlacedStamp.docId, selectedPlacedStamp.stampId,
                    normalizeStampAppearance(REALISTIC_STAMP_PRESET)
                )}
                onRestoreDefault={handleRestoreDefault}
                onDelete={() => removePlacedStamp(selectedPlacedStamp.docId, selectedPlacedStamp.stampId)}
            />
        </div>
    );
};

export default StampInspector;
