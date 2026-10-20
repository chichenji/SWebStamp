import React from 'react';
import { ScanLine, RotateCcw } from 'lucide-react';
import { useApp } from '../context/useApp';
import { PRESET_MAP, SCAN_MODE_LABELS, SCAN_MODES } from '../utils/scanEffect/scanConstants.js';
import FloatingToolWindow from './FloatingToolWindow';
import './scanEffect.css';

const TONE_FIELDS = [
    { key: 'brightness', label: '亮度', min: -100, max: 100 },
    { key: 'contrast', label: '对比度', min: -100, max: 100 },
    { key: 'monochromeThreshold', label: '黑白阈值', min: 0, max: 255 }
];
const PAPER_FIELDS = [
    { key: 'paperTexture', label: '纸张纤维', min: 0, max: 100 },
    { key: 'baseGray', label: '纸面底灰', min: 0, max: 100 },
    { key: 'grain', label: '扫描颗粒', min: 0, max: 100 },
    { key: 'edgeShadow', label: '边缘阴影', min: 0, max: 100 }
];
const ADVANCED_FIELDS = [
    { key: 'subtleBlur', label: '轻微模糊', min: 0, max: 5, step: 0.1 },
    { key: 'tiltAngle', label: '纸面倾斜', min: -5, max: 5, step: 0.1 }
];
const ScanSlider = ({ field, config, onChange }) => (
    <label className="scan-slider">
        <span>{field.label}<output>{config[field.key]}</output></span>
        <input aria-label={field.label} type="range" min={field.min} max={field.max} step={field.step ?? 1}
            value={config[field.key]} onChange={event => onChange({ [field.key]: Number(event.target.value) })} />
    </label>
);
const ScanAdjustments = ({ config, onChange }) => (
    <>
        <div className="scan-presets">{Object.entries(SCAN_MODE_LABELS).map(([mode, label]) => (
            <button type="button" key={mode} className={config.mode === mode ? 'is-active' : ''}
                onClick={() => onChange({ ...PRESET_MAP[mode], fitToA4: config.fitToA4,
                    preserveStampColors: config.preserveStampColors })}>{label}</button>
        ))}</div>
        <section className="scan-section"><h3>色调</h3>{TONE_FIELDS.filter(field =>
            field.key !== 'monochromeThreshold' || config.mode === SCAN_MODES.MONOCHROME
        ).map(field => <ScanSlider key={field.key} field={field} config={config} onChange={onChange} />)}</section>
        <section className="scan-section"><h3>复印纸质感</h3>{PAPER_FIELDS.map(field =>
            <ScanSlider key={field.key} field={field} config={config} onChange={onChange} />)}</section>
        <label className="scan-check"><input type="checkbox" checked={config.preserveStampColors}
            onChange={event => onChange({ preserveStampColors: event.target.checked })} />保留印章颜色（普通章和骑缝章）</label>
        <label className="scan-check"><input type="checkbox" checked={config.fitToA4}
            onChange={event => onChange({ fitToA4: event.target.checked })} />适配真实 A4 纸张，等比居中</label>
        <details className="scan-section"><summary>高级设置</summary>{ADVANCED_FIELDS.map(field =>
            <ScanSlider key={field.key} field={field} config={config} onChange={onChange} />)}</details>
    </>
);

const ScanEffectTool = ({ isOpen, onClose }) => {
    const { documents, activeDocumentId, scanScope, setScanScope, scanConfig, updateScanConfig,
        compareOriginal, setCompareOriginal, resetScanConfig } = useApp();
    if (!isOpen) return null;
    const pageNumber = documents.findIndex(doc => doc.id === activeDocumentId) + 1;
    return (
        <FloatingToolWindow title="扫描效果" onClose={onClose} width={350} footer={<>
            <button type="button" className="tool-secondary" onClick={resetScanConfig}><RotateCcw size={13} /> 恢复默认</button>
            <button type="button" className="tool-primary" onClick={onClose}>完成</button>
        </>}>
            <div className="scan-intro"><ScanLine size={23} /><div><strong>像刚从扫描仪取出的纸张</strong>
                <p>本地处理 · 保留细字与表格 · 不改变原文件</p></div></div>
            <label className="scan-check scan-enable"><input type="checkbox" checked={scanConfig.enabled}
                onChange={event => updateScanConfig({ enabled: event.target.checked })} />启用扫描效果</label>
            <label className="scan-scope">调整范围<select aria-label="扫描调整范围" value={scanScope}
                onChange={event => setScanScope(event.target.value)}>
                <option value="all">全部页面（含之后新增页面）</option>
                <option value="page" disabled={!activeDocumentId}>仅当前第 {pageNumber} 页</option>
            </select></label>
            <p className="scan-hint">{scanScope === 'all' ? '接下来的调整会统一全部页面的参数。' : '设置跟随此页，不受页面重排影响。'}</p>
            <fieldset disabled={!scanConfig.enabled} className="scan-fieldset">
                <ScanAdjustments config={scanConfig} onChange={updateScanConfig} />
                <label className="scan-check"><input type="checkbox" checked={compareOriginal}
                    onChange={event => setCompareOriginal(event.target.checked)} />对比原图（仅预览，导出仍使用扫描效果）</label>
            </fieldset>
        </FloatingToolWindow>
    );
};
export default ScanEffectTool;
