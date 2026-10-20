import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Scissors, Trash2 } from 'lucide-react';
import { useApp } from '../context/useApp';
import { sliceStampImage } from '../utils/pdfUtils';
import {
    REALISTIC_STAMP_PRESET,
    getStampFilter,
    normalizeStampAppearance
} from '../utils/stampAppearance';
import FloatingToolWindow from './FloatingToolWindow';
import StampAppearanceControls from './StampAppearanceControls';

const INITIAL_CONFIG = Object.freeze({
    position: 'right',
    size: 0.15,
    yPercent: 0.35,
    rotation: 0,
    xOffset: 0,
    ...REALISTIC_STAMP_PRESET
});

const NumericRange = ({ label, value, min, max, step, onChange, format }) => (
    <label className="stamp-range-control">
        <span className="stamp-range-label"><span>{label}</span><output>{format(value)}</output></span>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={event => onChange(Number(event.target.value))}
        />
    </label>
);

const CrossPageStampTool = ({ isOpen, onClose }) => {
    const {
        applyCrossPageStamp,
        clearCrossPageStamp,
        crossPageStamp,
        documents,
        setCrossPagePreview,
        stamps
    } = useApp();
    const [selectedStampId, setSelectedStampId] = useState(() => crossPageStamp?.stampId || null);
    const [config, setConfig] = useState(() => crossPageStamp || INITIAL_CONFIG);
    const [slices, setSlices] = useState([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const selectedStamp = useMemo(
        () => stamps.find(stamp => stamp.id === selectedStampId),
        [selectedStampId, stamps]
    );
    const appearance = normalizeStampAppearance(config);
    const pageCount = documents.length;
    const hasData = pageCount > 0 && stamps.length > 0;
    const updateConfig = updates => setConfig(current => ({ ...current, ...updates }));

    useEffect(() => {
        if (!selectedStamp || pageCount === 0) return undefined;
        let isCurrent = true;
        sliceStampImage({
            stampUrl: selectedStamp.url,
            pageCount,
            rotation: config.rotation,
            xOffsetRatio: config.xOffset
        }).then(result => {
            if (!isCurrent) return;
            setSlices(result.slices);
            setPreviewIndex(0);
        });
        return () => { isCurrent = false; };
    }, [config.rotation, config.xOffset, pageCount, selectedStamp]);

    useEffect(() => {
        if (!isOpen || !selectedStamp || pageCount === 0) return undefined;
        setCrossPagePreview({
            stampId: selectedStamp.id,
            stampUrl: selectedStamp.url,
            ...config
        });
        return undefined;
    }, [config, isOpen, pageCount, selectedStamp, setCrossPagePreview]);

    if (!isOpen) return null;

    const closeTool = () => {
        setCrossPagePreview(null);
        onClose();
    };
    const applyStamp = () => {
        if (!selectedStamp) return;
        applyCrossPageStamp({ stampId: selectedStamp.id, stampUrl: selectedStamp.url, ...config });
        closeTool();
    };
    const clearStamp = () => {
        clearCrossPageStamp();
        setCrossPagePreview(null);
    };

    const footer = (
        <>
            <button type="button" className="tool-secondary" onClick={closeTool}>取消</button>
            <button type="button" className="tool-primary" disabled={!selectedStamp} onClick={applyStamp}>应用骑缝章</button>
        </>
    );

    return (
        <FloatingToolWindow title="骑缝章设置" onClose={closeTool} footer={footer} width={400}>
            {!hasData ? (
                <div className="tool-empty"><Scissors size={25} /><strong>缺少文档或印章素材</strong></div>
            ) : (
                <div className="cross-tool-content">
                    <section>
                        <div className="section-title">印章素材</div>
                        <div className="cross-stamp-grid">
                            {stamps.map(stamp => (
                                <button
                                    key={stamp.id}
                                    type="button"
                                    className={selectedStampId === stamp.id ? 'is-active' : ''}
                                    onClick={() => setSelectedStampId(stamp.id)}
                                    title={stamp.name}
                                >
                                    <img src={stamp.url} alt={stamp.name} />
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="cross-position-row">
                        <div className="section-title">页面边缘</div>
                        <div className="segmented-control">
                            {['left', 'right'].map(position => (
                                <button
                                    key={position}
                                    type="button"
                                    className={config.position === position ? 'is-active' : ''}
                                    onClick={() => updateConfig({ position })}
                                >
                                    {position === 'left' ? '左侧' : '右侧'}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="cross-range-grid">
                        <NumericRange label="大小" value={config.size} min={0.08} max={0.3} step={0.01} format={value => `${Math.round(value * 100)}%`} onChange={size => updateConfig({ size })} />
                        <NumericRange label="垂直位置" value={config.yPercent} min={0} max={0.85} step={0.01} format={value => `${Math.round(value * 100)}%`} onChange={yPercent => updateConfig({ yPercent })} />
                        <NumericRange label="水平微调" value={config.xOffset} min={-0.5} max={0.5} step={0.01} format={value => `${Math.round(value * 100)}%`} onChange={xOffset => updateConfig({ xOffset })} />
                        <NumericRange label="旋转" value={config.rotation} min={-180} max={180} step={1} format={value => `${Math.round(value)}°`} onChange={rotation => updateConfig({ rotation })} />
                    </section>

                    <section className="cross-appearance-section">
                        <StampAppearanceControls value={appearance} onChange={updateConfig} />
                    </section>

                    {slices.length > 0 && (
                        <section className="cross-preview">
                            <button type="button" disabled={previewIndex === 0} onClick={() => setPreviewIndex(index => index - 1)} title="上一片"><ChevronLeft size={16} /></button>
                            <img
                                src={slices[previewIndex]}
                                alt={`第 ${previewIndex + 1} 页骑缝章`}
                                style={{ filter: getStampFilter(appearance), opacity: appearance.opacity, mixBlendMode: appearance.blendMode }}
                            />
                            <button type="button" disabled={previewIndex === slices.length - 1} onClick={() => setPreviewIndex(index => index + 1)} title="下一片"><ChevronRight size={16} /></button>
                            <span>{previewIndex + 1} / {slices.length}</span>
                        </section>
                    )}

                    {crossPageStamp && (
                        <div className="cross-applied-state">
                            <Check size={15} /><span>骑缝章已应用</span>
                            <button type="button" onClick={clearStamp}><Trash2 size={14} /> 清除</button>
                        </div>
                    )}
                </div>
            )}
        </FloatingToolWindow>
    );
};

export default CrossPageStampTool;
