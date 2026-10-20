import React from 'react';
import { Download, RotateCcw, ScanLine, ShieldCheck, Stamp } from 'lucide-react';

const HomeHeader = ({ pageCount, onScan, onVerify, onExport }) => (
    <header className="app-header">
        <div className="brand-lockup">
            <div className="brand-mark"><Stamp size={21} /></div>
            <div><h1>SWebStamp</h1><span>文档盖章工作台</span></div>
        </div>
        <div className="header-status"><span>{pageCount} 页</span></div>
        <div className="header-actions">
            <button type="button" className="command-button" onClick={onScan}><ScanLine size={16} /> 扫描效果</button>
            <button type="button" className="command-button" onClick={() => window.location.reload()}><RotateCcw size={16} /> 重置</button>
            <button type="button" className="command-button" onClick={onVerify}><ShieldCheck size={16} /> 验证</button>
            <button type="button" className="primary-command" disabled={!pageCount} onClick={onExport}><Download size={16} /> 导出</button>
        </div>
    </header>
);
export default HomeHeader;
