import React, { useRef } from 'react';

const APPEARANCE_FIELDS = [
    { key: 'opacity', label: '透明度', min: 0.05, max: 1, step: 0.05, format: value => `${Math.round(value * 100)}%` },
    { key: 'angle', label: '倾斜角度', min: -180, max: 180, step: 5, format: value => `${value}°` }
];
const POSITION_FIELDS = [
    { key: 'positionX', label: '水平位置', min: 0, max: 100, format: value => `${value}%` },
    { key: 'positionY', label: '垂直位置', min: 0, max: 100, format: value => `${value}%` }
];
const SPACING_FIELD = { key: 'density', label: '阵列间距', min: 0.5, max: 3, step: 0.1 };
const FONT_FIELD = { key: 'fontSize', label: '字号', min: 12, max: 120, step: 2 };

const getFieldLabel = (field, layout) => {
    if (field.key === 'angle' && layout === 'array') {
        return '整行倾斜角度';
    }
    return field.label;
};

const WatermarkSlider = ({ field, config, onChange }) => {
    const label = getFieldLabel(field, config.layout);
    return (
        <label className="scan-slider">
            <span>{label}<output>{field.format ? field.format(config[field.key]) : config[field.key]}</output></span>
            <input
                aria-label={label}
                type="range"
                min={field.min}
                max={field.max}
                step={field.step ?? 1}
                value={config[field.key]}
                onChange={event => onChange({ [field.key]: Number(event.target.value) })}
            />
        </label>
    );
};

const ImageWatermarkInput = ({ config, onChange }) => {
    const input = useRef(null);
    const upload = event => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => onChange({ type: 'image', imageUrl: reader.result });
        reader.onerror = () => alert(`无法读取水印图片：${reader.error.message}`);
        reader.readAsDataURL(file);
        event.target.value = '';
    };
    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={() => input.current.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-sm text-gray-500 hover:border-blue-500"
            >
                {config.imageUrl ? <img src={config.imageUrl} alt="水印图片预览" className="max-h-24 mx-auto object-contain" /> : '点击选择水印图片'}
            </button>
            <input aria-label="上传水印图片" type="file" accept="image/*" ref={input} className="hidden" onChange={upload} />
        </div>
    );
};

const WatermarkContent = ({ config, onChange }) => (
    <section className="scan-section">
        <label className="scan-scope">水印类型<select aria-label="水印类型" value={config.type}
            onChange={event => onChange({ type: event.target.value })}>
            <option value="text">文字</option><option value="image">图片</option>
        </select></label>
        {config.type === 'text' ? <div className="space-y-3 mt-3">
            <label className="block text-sm text-gray-700">水印文字
                <input aria-label="水印文字" type="text" value={config.text} placeholder="输入水印内容"
                    onChange={event => onChange({ text: event.target.value })}
                    className="block w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
            </label>
            <label className="scan-scope">颜色<input aria-label="水印颜色" type="color" value={config.color}
                onChange={event => onChange({ color: event.target.value })} /></label>
            <WatermarkSlider field={FONT_FIELD} config={config} onChange={onChange} />
        </div> : <ImageWatermarkInput config={config} onChange={onChange} />}
    </section>
);

const WatermarkControls = ({ config, onChange }) => (
    <>
        <section className="scan-section">
            <h3>水印布局</h3>
            <div className="scan-presets" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <button type="button" aria-pressed={config.layout === 'single'} className={config.layout === 'single' ? 'is-active' : ''}
                    onClick={() => onChange({ layout: 'single' })}>单行水印</button>
                <button type="button" aria-pressed={config.layout === 'array'} className={config.layout === 'array' ? 'is-active' : ''}
                    onClick={() => onChange({ layout: 'array' })}>阵列水印</button>
            </div>
            <p className="scan-hint">
                {config.layout === 'single'
                    ? '每页只显示一处文字或图片，可调整位置与倾斜角度。'
                    : '在每页按整行平铺水印，调节角度可旋转整行方向，向右延展排列。'}
            </p>
        </section>
        <WatermarkContent config={config} onChange={onChange} />
        <section className="scan-section">
            <h3>外观</h3>
            {APPEARANCE_FIELDS.map(field =>
                <WatermarkSlider key={field.key} field={field} config={config} onChange={onChange} />)}
        </section>
        <section className="scan-section">
            <h3>{config.layout === 'single' ? '水印位置' : '平铺设置'}</h3>
            {(config.layout === 'single' ? POSITION_FIELDS : [SPACING_FIELD]).map(field =>
                <WatermarkSlider key={field.key} field={field} config={config} onChange={onChange} />)}
        </section>
    </>
);
export default WatermarkControls;
