import React from 'react';
import { RotateCcw, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useApp } from '../context/useApp';
import {
    REALISTIC_STAMP_PRESET,
    normalizeStampAppearance
} from '../utils/stampAppearance';
import StampAppearanceControls from './StampAppearanceControls';

const RangeControl = ({ config, value, onChange }) => (
    <label className="stamp-range-control">
        <span className="stamp-range-label">
            <span>{config.label}</span>
            <output>{config.format(value)}</output>
        </span>
        <input
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

const StampInspector = () => {
    const {
        selectedPlacedStamp,
        selectedStamp,
        updatePlacedStamp,
        removePlacedStamp
    } = useApp();

    if (!selectedPlacedStamp || !selectedStamp) return <EmptyInspector />;

    const appearance = normalizeStampAppearance(selectedStamp);
    const updateAppearance = (updates) => {
        updatePlacedStamp(
            selectedPlacedStamp.docId,
            selectedPlacedStamp.stampId,
            normalizeStampAppearance({ ...appearance, ...updates })
        );
    };
    const updateRotation = (rotation) => updatePlacedStamp(
        selectedPlacedStamp.docId,
        selectedPlacedStamp.stampId,
        { rotation }
    );
    const removeSelected = () => removePlacedStamp(
        selectedPlacedStamp.docId,
        selectedPlacedStamp.stampId
    );

    return (
        <div className="stamp-inspector">
            <div className="inspector-preview">
                <img src={selectedStamp.url} alt="当前印章" />
                <div>
                    <strong>印章属性</strong>
                    <span>{Math.round(selectedStamp.widthPercent * 100)}% 页面宽度</span>
                </div>
            </div>

            <section className="inspector-section inspector-ranges">
                <StampAppearanceControls value={appearance} onChange={updateAppearance} />
                <RangeControl
                    config={{ label: '角度', min: -180, max: 180, step: 1, format: value => `${Math.round(value)}°` }}
                    value={selectedStamp.rotation || 0}
                    onChange={updateRotation}
                />
            </section>

            <div className="inspector-actions">
                <button type="button" onClick={() => updateAppearance(REALISTIC_STAMP_PRESET)}>
                    <RotateCcw size={15} /> 真实印章
                </button>
                <button type="button" className="danger" onClick={removeSelected}>
                    <Trash2 size={15} /> 删除
                </button>
            </div>
        </div>
    );
};

export default StampInspector;
