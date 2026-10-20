import React, { useState } from 'react';
import { Copy, Download, FileText, Image, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { useExportJob } from './useExportJob';
import { getMachineId, QUALITY_PRESETS } from '../utils/pdfUtils';

const loadSavedSettings = () => {
    try { return JSON.parse(localStorage.getItem('exportSettings') || '{}'); }
    catch { return {}; }
};

const FormatSelector = ({ value, onChange }) => (
    <section className="export-section">
        <div className="export-section-title">导出格式</div>
        <div className="export-format-grid">
            {[
                { value: 'pdf', label: 'PDF 文档', icon: FileText },
                { value: 'images', label: '高清图片', icon: Image }
            ].map(option => (
                <button
                    key={option.value}
                    type="button"
                    className={value === option.value ? 'is-active' : ''}
                    onClick={() => onChange(option.value)}
                >
                    <option.icon size={17} /> {option.label}
                </button>
            ))}
        </div>
    </section>
);

const QualitySelector = ({ value, onChange }) => (
    <section className="export-section">
        <div className="export-section-title">输出质量</div>
        <div className="export-quality-grid">
            {Object.entries(QUALITY_PRESETS).map(([key, preset]) => (
                <button
                    key={key}
                    type="button"
                    className={value === key ? 'is-active' : ''}
                    onClick={() => onChange(key)}
                >
                    <strong>{preset.label}</strong>
                    <span>{preset.desc}</span>
                </button>
            ))}
        </div>
    </section>
);

const SecurityOptions = ({ machineId, password, verification, onPasswordChange, onVerificationChange }) => (
    <section className="export-security">
        <label className="verification-toggle">
            <input type="checkbox" checked={verification} onChange={event => onVerificationChange(event.target.checked)} />
            <ShieldCheck size={17} />
            <span><strong>隐形防伪验证</strong><small>写入设备指纹与时间戳</small></span>
        </label>
        <label className="password-field">
            <LockKeyhole size={16} />
            <input type="text" value={password} onChange={event => onPasswordChange(event.target.value)} placeholder="编辑密码（可选）" />
        </label>
        <div className="machine-id-row">
            <span>设备 ID</span>
            <code>{machineId}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(machineId)} title="复制设备 ID"><Copy size={14} /></button>
        </div>
    </section>
);

const ExportModal = ({ isOpen, onClose, onConfirm }) => {
    const saved = loadSavedSettings();
    const [password, setPassword] = useState(saved.password || '');
    const [verification, setVerification] = useState(saved.enableVerification ?? true);
    const [quality, setQuality] = useState(saved.qualityPreset || 'balanced');
    const [format, setFormat] = useState(saved.exportFormat || 'pdf');
    const [machineId] = useState(getMachineId);
    const { exporting, progress, error, confirmExport } = useExportJob({ onConfirm, onClose,
        settings: { password, enableVerification: verification, qualityPreset: quality, exportFormat: format } });
    if (!isOpen) return null;
    return (
        <div className="modal-backdrop" role="presentation">
            <section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title">
                <header>
                    <div><Download size={18} /><h2 id="export-title">导出文档</h2></div>
                    <button type="button" disabled={exporting} onClick={onClose} title="关闭"><X size={18} /></button>
                </header>
                <div className="export-dialog-body">
                    <fieldset disabled={exporting} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                    <FormatSelector value={format} onChange={setFormat} />
                    <QualitySelector value={quality} onChange={setQuality} />
                    <SecurityOptions
                        machineId={machineId}
                        password={password}
                        verification={verification}
                        onPasswordChange={setPassword}
                        onVerificationChange={setVerification}
                    />
                    </fieldset>
                </div>
                {exporting && <div className="scan-export-progress" role="status">{progress?.message}
                    <progress value={progress?.percent ?? 0} max="100" /></div>}
                {error && <div className="scan-export-error" role="alert">{error}</div>}
                <footer>
                    <button type="button" className="tool-secondary" disabled={exporting} onClick={onClose}>取消</button>
                    <button type="button" className="tool-primary" disabled={exporting} onClick={confirmExport}>
                        <Download size={15} /> {exporting ? '正在导出…' : '确认导出'}</button>
                </footer>
            </section>
        </div>
    );
};

export default ExportModal;
