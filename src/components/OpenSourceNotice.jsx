import React from 'react';
import licenseText from '../../LICENSE?raw';
import './openSourceNotice.css';

const REPO_URL = 'https://github.com/chichenji/SWebStamp';

const OpenSourceNotice = () => (
    <details className="open-source-notice">
        <summary className="open-source-summary">
            <span className="open-source-summary-label">开源信息</span>
            <span className="open-source-badge">MIT 开源</span>
        </summary>
        <div className="open-source-body">
            <div className="open-source-section">
                <span className="open-source-meta-label">项目仓库</span>
                <span className="open-source-url-text">{REPO_URL}</span>
            </div>
            <div className="open-source-section">
                <span className="open-source-meta-label">授权声明</span>
                <span className="open-source-copyright">Copyright (c) 2026 chichenji</span>
            </div>
            <p className="open-source-clause">
                本项目原创代码与文档采用 MIT 协议开源；第三方依赖保留各自许可证；本地印章与用户私有上传文档不随项目分发或授权。
            </p>
            <div className="open-source-license-wrap">
                <span className="open-source-meta-label">MIT 完整条款</span>
                <pre className="open-source-license-pre">{licenseText}</pre>
            </div>
        </div>
    </details>
);

export default OpenSourceNotice;
