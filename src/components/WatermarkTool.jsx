import React from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../context/useApp';
import { resolveWatermarkConfig } from '../utils/watermarkConfig.js';
import FloatingToolWindow from './FloatingToolWindow';
import WatermarkControls from './WatermarkControls';
import './scanEffect.css';

const WatermarkTool = ({ isOpen, onClose }) => {
    const { watermarkConfig, updateWatermarkConfig, clearWatermarkConfig } = useApp();
    if (!isOpen) return null;
    return <FloatingToolWindow title="全局水印设置" onClose={onClose} width={340} footer={<>
        <button type="button" className="tool-secondary" onClick={clearWatermarkConfig}><Trash2 size={14} />移除水印</button>
        <button type="button" className="tool-primary" onClick={onClose}>完成</button>
    </>}>
        <p className="scan-hint">应用到全部页面；修改后实时预览，导出保留相同布局。</p>
        <WatermarkControls config={resolveWatermarkConfig(watermarkConfig)} onChange={updateWatermarkConfig} />
    </FloatingToolWindow>;
};
export default WatermarkTool;
