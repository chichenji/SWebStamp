import React from 'react';
import { Blend } from 'lucide-react';
import { normalizeStampAppearance } from '../utils/stampAppearance';

const CONTROLS = Object.freeze([
    { key: 'opacity', label: '透明度', min: 0.1, max: 1 },
    { key: 'brightness', label: '亮度', min: 0.5, max: 1.5 },
    { key: 'contrast', label: '对比度', min: 0.5, max: 2 },
    { key: 'saturation', label: '饱和度', min: 0, max: 2 }
]);

const StampAppearanceControls = ({ value, onChange }) => {
    const appearance = normalizeStampAppearance(value);
    return (
        <div className="appearance-controls">
            <div className="section-title"><Blend size={15} /> 混合模式</div>
            <div className="segmented-control">
                {[
                    ['normal', '正常'],
                    ['multiply', '正片叠底']
                ].map(([mode, label]) => (
                    <button
                        key={mode}
                        type="button"
                        className={appearance.blendMode === mode ? 'is-active' : ''}
                        onClick={() => onChange({ blendMode: mode })}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <div className="inspector-ranges appearance-ranges">
                {CONTROLS.map(control => (
                    <label key={control.key} className="stamp-range-control">
                        <span className="stamp-range-label">
                            <span>{control.label}</span>
                            <output>{Math.round(appearance[control.key] * 100)}%</output>
                        </span>
                        <input
                            type="range"
                            min={control.min}
                            max={control.max}
                            step="0.01"
                            value={appearance[control.key]}
                            onChange={event => onChange({ [control.key]: Number(event.target.value) })}
                        />
                    </label>
                ))}
            </div>
        </div>
    );
};

export default StampAppearanceControls;
