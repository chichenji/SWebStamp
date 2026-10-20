import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/useApp';
import { convertPdfToImages } from '../utils/pdfUtils';
import { API_ENDPOINTS } from '../config/api';
import LibreOfficeDownloadPanel from './LibreOfficeDownloadPanel';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

/**
 * 判断文件是否为 Office 文档类型
 */
const isOfficeDocument = (file) => {
    const officeTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
    ];
    if (officeTypes.includes(file.type)) return true;
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
};

/**
 * 调用后端 API 将 Office 文件转换为 PDF，然后渲染为图片
 */
const convertOfficeToImages = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(API_ENDPOINTS.CONVERT.UPLOAD, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '服务器错误' }));
        // 传递特殊错误码
        if (err.code === 'LIBRE_NOT_FOUND') {
            const error = new Error(err.error);
            error.code = 'LIBRE_NOT_FOUND';
            throw error;
        }
        throw new Error(err.error || `转换失败 (${response.status})`);
    }

    const pdfBlob = await response.blob();
    const pdfFile = new File([pdfBlob], `${file.name}.pdf`, { type: 'application/pdf' });
    const images = await convertPdfToImages(pdfFile);

    return images.map((img, idx) => ({
        ...img,
        name: `${file.name} - 第 ${idx + 1} 页`
    }));
};

const FileUpload = () => {
    const { addDocuments, setIsProcessing } = useApp();
    const [convertProgress, setConvertProgress] = useState(null);
    const [convertError, setConvertError] = useState(null);

    // LibreOffice 下载相关状态
    const [showDownloadPanel, setShowDownloadPanel] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState(null);
    const [pendingFiles, setPendingFiles] = useState([]);
    const pollIntervalRef = useRef(null);

    // 清理轮询
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    // 开始下载 LibreOffice
    const handleStartDownload = async () => {
        try {
            setDownloadStatus({ status: 'downloading', progress: 0, message: '正在启动下载...' });

            await fetch(API_ENDPOINTS.CONVERT.DOWNLOAD, { method: 'POST' });

            // 轮询下载进度
            pollIntervalRef.current = setInterval(async () => {
                try {
                    const res = await fetch(API_ENDPOINTS.CONVERT.DOWNLOAD_STATUS);
                    const state = await res.json();
                    setDownloadStatus(state);

                    if (state.status === 'done') {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                        // 自动处理待转换文件
                        if (pendingFiles.length > 0) {
                            setTimeout(() => retryPendingFiles(), 1000);
                        }
                    } else if (state.status === 'error') {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                } catch (err) {
                    console.error('轮询状态失败:', err);
                }
            }, 2000);
        } catch (err) {
            setDownloadStatus({ status: 'error', error: err.message });
        }
    };

    // 下载完成后自动处理待转换文件
    const retryPendingFiles = async () => {
        if (pendingFiles.length === 0) return;

        setIsProcessing(true);
        setConvertProgress({ fileName: '处理待转换文件...', status: '正在转换' });
        const newDocs = [];

        for (const file of pendingFiles) {
            try {
                setConvertProgress({ fileName: file.name, status: '正在转换...' });
                const images = await convertOfficeToImages(file);
                newDocs.push(...images);
            } catch (error) {
                console.error(`重试转换失败: ${file.name}`, error);
                setConvertError(`${file.name}: ${error.message}`);
            }
        }

        if (newDocs.length > 0) {
            addDocuments(newDocs);
        }

        setPendingFiles([]);
        setConvertProgress(null);
        setShowDownloadPanel(false);
        setDownloadStatus(null);
        setIsProcessing(false);
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        setIsProcessing(true);
        setConvertError(null);
        const newDocs = [];

        for (const file of acceptedFiles) {
            if (file.type === 'application/pdf') {
                try {
                    const pdfImages = await convertPdfToImages(file);
                    newDocs.push(...pdfImages);
                } catch (error) {
                    console.error("Error converting PDF:", error);
                    setConvertError(`PDF 解析失败: ${file.name}`);
                }
            } else if (isOfficeDocument(file)) {
                try {
                    setConvertProgress({ fileName: file.name, status: '正在转换...' });
                    const officeImages = await convertOfficeToImages(file);
                    newDocs.push(...officeImages);
                    setConvertProgress(null);
                } catch (error) {
                    console.error("Error converting Office document:", error);
                    setConvertProgress(null);

                    if (error.code === 'LIBRE_NOT_FOUND') {
                        // 需要下载 LibreOffice
                        setPendingFiles(prev => [...prev, file]);
                        setShowDownloadPanel(true);
                        setConvertError(null); // 不显示错误，显示下载面板
                    } else {
                        setConvertError(`${file.name}: ${error.message}`);
                    }
                }
            } else {
                newDocs.push({
                    id: generateId(),
                    file,
                    type: file.type,
                    name: file.name,
                    previewUrl: URL.createObjectURL(file)
                });
            }
        }

        if (newDocs.length > 0) {
            addDocuments(newDocs);
        }
        setIsProcessing(false);
    }, [addDocuments, setIsProcessing]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg'],
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'application/vnd.ms-powerpoint': ['.ppt'],
        }
    });

    return (
        <div className="space-y-3">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}
                `}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 rounded-full bg-indigo-50 text-indigo-600">
                        <Upload size={32} />
                    </div>
                    <div>
                        <p className="text-lg font-medium text-gray-900">
                            {isDragActive ? '释放文件以上传' : '点击或拖拽上传文件'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            支持 PDF, PNG, JPG, Word, Excel, PPT
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <FileText size={14} className="text-blue-500" />
                            <span className="text-xs text-gray-400">
                                Office 文档将自动转换为 PDF 后处理
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 转换进度 */}
            {convertProgress && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-sm">
                    <Loader2 size={16} className="text-indigo-600 animate-spin" />
                    <span className="text-indigo-700 font-medium">
                        {convertProgress.fileName}: {convertProgress.status}
                    </span>
                </div>
            )}

            {showDownloadPanel && (
                <LibreOfficeDownloadPanel
                    pendingCount={pendingFiles.length}
                    status={downloadStatus}
                    onClose={() => {
                        setShowDownloadPanel(false);
                        setPendingFiles([]);
                    }}
                    onStart={handleStartDownload}
                />
            )}

            {/* 转换错误 */}
            {convertError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-sm">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-red-700 font-medium">{convertError}</p>
                    </div>
                    <button
                        onClick={() => setConvertError(null)}
                        className="ml-auto text-red-400 hover:text-red-600 text-xs font-medium"
                    >
                        关闭
                    </button>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
