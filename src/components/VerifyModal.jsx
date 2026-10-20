import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { ShieldCheck, Upload, AlertCircle, FileText, Smartphone, Calendar, CheckCircle, RotateCcw, History, Clock } from 'lucide-react';
import { verifyPdfFile, getAuditLogs } from '../utils/pdfUtils';

const VerifyModal = ({ isOpen, onClose }) => {
    const [result, setResult] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('verify'); // 'verify' or 'history'
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const fetchLogs = async () => {
            if (isOpen && viewMode === 'history') {
                const history = await getAuditLogs();
                setLogs(history);
            }
        };
        fetchLogs();
    }, [isOpen, viewMode]);

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setIsVerifying(true);
        setError(null);
        setResult(null);

        try {
            const verificationResult = await verifyPdfFile(file);
            setTimeout(() => {
                if (verificationResult.isValid) {
                    setResult(verificationResult);
                } else {
                    setError(verificationResult.error || "验证失败");
                }
                setIsVerifying(false);
            }, 600);
        } catch (err) {
            console.error(err);
            setError("文件读取或解密失败");
            setIsVerifying(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    });

    const reset = () => {
        setResult(null);
        setError(null);
        setViewMode('verify');
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
                zIndex: 9999,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0
            }}
        >
            <div
                className="rounded-2xl shadow-2xl overflow-hidden border border-gray-700 bg-white"
                style={{
                    backgroundColor: '#ffffff',
                    transform: 'none',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '360px',
                    maxWidth: '360px'
                }}
            >
                {/* Header */}
                <div className="bg-gray-900 text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="text-green-400 w-5 h-5" />
                        <div>
                            <h3 className="text-base font-bold leading-none">文档真伪验证</h3>
                            <span className="text-[10px] text-gray-400 font-mono">
                                {window.electron ? 'Storage: D:\\WebPDF_Data' : 'Storage: Browser Cache'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setViewMode(viewMode === 'verify' ? 'history' : 'verify')}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${viewMode === 'history' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-600 text-gray-400 hover:text-white'}`}
                        >
                            {viewMode === 'history' ? '返回验证' : '查看记录'}
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                    </div>
                </div>

                <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
                    {viewMode === 'history' ? (
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2">
                                <History size={16} /> 本地生成记录 (最近100条)
                            </h4>
                            {logs.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">暂无导出记录</p>
                            ) : (
                                <ul className="space-y-2">
                                    {logs.map((log, idx) => (
                                        <li key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-indigo-700 flex items-center gap-1">
                                                    <Clock size={10} /> {log.timestamp}
                                                </span>
                                            </div>
                                            <div className="text-gray-600 truncate mb-1" title={log.filename}>{log.filename}</div>
                                            <div className="font-mono text-gray-400 text-[10px] break-all">Hash: {log.hash.substring(0, 16)}...</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : (
                        <>
                            {!result && !error && (
                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer h-64
                                        ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}
                                    `}
                                >
                                    <input {...getInputProps()} />
                                    {isVerifying ? (
                                        <div className="space-y-3">
                                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                                            <p className="text-sm font-medium text-gray-600">正在通过 PDF 引擎解密...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-indigo-100 p-3 rounded-full mb-3">
                                                <Upload className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-700">点击或拖拽 PDF 文件到此处</p>
                                            <p className="text-xs text-gray-400 mt-1">支持验证本工具生成的加密防伪文档</p>
                                        </>
                                    )}
                                </div>
                            )}

                            {error && (
                                <div className="text-center py-8">
                                    <div className="bg-red-100 p-3 rounded-full mx-auto w-fit mb-3">
                                        <AlertCircle className="w-8 h-8 text-red-600" />
                                    </div>
                                    <h4 className="text-lg font-bold text-red-700 mb-1">验证失败</h4>
                                    <p className="text-sm text-gray-600 mb-6">{error}</p>
                                    <button onClick={reset} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">重试</button>
                                </div>
                            )}

                            {result && (
                                <div className="animate-fade-in">
                                    <div className="text-center mb-5">
                                        <div className="bg-green-100 p-2 rounded-full mx-auto w-fit mb-2">
                                            <CheckCircle className="w-8 h-8 text-green-600" />
                                        </div>
                                        <h4 className="text-lg font-bold text-green-700">文档验证通过</h4>
                                        <p className="text-xs text-gray-400">元数据签名有效，内容未被篡改</p>
                                    </div>

                                    <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm">
                                        <div className="flex items-start gap-3">
                                            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                                            <div>
                                                <span className="block text-xs text-gray-400 font-medium">生成时间</span>
                                                <span className="font-mono text-gray-800">{result.data.t}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Smartphone className="w-4 h-4 text-gray-400 mt-0.5" />
                                            <div>
                                                <span className="block text-xs text-gray-400 font-medium">生成设备 ID</span>
                                                <span className="font-mono text-xs text-gray-800 break-all">{result.data.m}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                                            <div>
                                                <span className="block text-xs text-gray-400 font-medium">内容数字指纹 (Hash)</span>
                                                <span className="font-mono text-xs text-gray-500 break-all">{result.data.h.substring(0, 16)}...</span>
                                            </div>
                                        </div>

                                        <div className={`mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 ${result.auditLog ? 'text-green-600' : 'text-orange-500'}`}>
                                            {result.auditLog ? (
                                                <>
                                                    <CheckCircle size={14} />
                                                    <span className="text-xs font-bold">本机历史记录匹配 (可信)</span>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle size={14} />
                                                    <span className="text-xs font-bold">本机无导出记录 (可能是他人生成)</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-5 text-center">
                                        <button onClick={reset} className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium">
                                            <RotateCcw size={14} /> 验证另一个文件
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyModal;
