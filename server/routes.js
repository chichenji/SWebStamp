import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
    convertToPdf,
    checkLibreOfficeAvailable,
    downloadLibreOffice,
    getDownloadState,
    resetDownloadState
} from './utils/converter.js';
import {
    getOfficeUploadErrorResponse,
    isAllowedOfficeUpload,
    validateOfficeFile
} from './utils/officeUploadPolicy.js';

const router = express.Router();
const MAX_OFFICE_FILE_BYTES = 50 * 1024 * 1024;

// ============ Multer 文件上传配置 ============
const uploadDir = path.join(os.tmpdir(), 'webpdf-uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
    dest: uploadDir,
    limits: { fileSize: MAX_OFFICE_FILE_BYTES },
    fileFilter: (req, file, cb) => {
        if (isAllowedOfficeUpload(file)) cb(null, true);
        else cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
});
const uploadOfficeFile = upload.single('file');

const handleOfficeUpload = (req, res, next) => {
    uploadOfficeFile(req, res, error => {
        if (!error) {
            next();
            return;
        }
        const response = getOfficeUploadErrorResponse(error);
        res.status(response.status).json(response.body);
    });
};

// ============ 健康检查 ============
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// ============ LibreOffice 检查 ============
router.get('/convert/check', async (req, res) => {
    try {
        const result = await checkLibreOfficeAvailable();
        res.json(result);
    } catch (error) {
        res.status(500).json({ available: false, error: error.message });
    }
});

// ============ 下载状态查询 ============
router.get('/convert/download-status', (req, res) => {
    res.json(getDownloadState());
});

// ============ 触发 LibreOffice 下载 ============
router.post('/convert/download', (req, res) => {
    const state = getDownloadState();
    if (state.status === 'downloading' || state.status === 'extracting') {
        return res.json({ message: '下载已在进行中', state });
    }

    // 异步下载，不阻塞请求
    downloadLibreOffice().catch(err => {
        console.error('[API] LibreOffice 下载失败:', err.message);
    });

    res.json({ message: '下载已开始，请轮询 /api/convert/download-status 查看进度' });
});

// ============ 重置下载状态 ============
router.post('/convert/download-reset', (req, res) => {
    resetDownloadState();
    res.json({ message: '下载状态已重置' });
});

const cleanupFile = filePath => {
    if (!filePath) return;
    try { fs.unlinkSync(filePath); } catch { /* file already removed */ }
};

const sendPdf = ({ res, pdfPath, originalName }) => {
    const pdfBuffer = fs.readFileSync(pdfPath);
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(path.parse(originalName).name)}.pdf"`,
        'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
    return pdfBuffer.length;
};

const respondToConversionError = ({ res, error }) => {
    if (error.code === 'LIBRE_NOT_FOUND') {
        res.status(503).json({
            error: '未安装 LibreOffice 转换引擎',
            code: 'LIBRE_NOT_FOUND',
            needDownload: true,
            downloadState: getDownloadState()
        });
        return;
    }
    res.status(500).json({ error: error.message, code: 'CONVERSION_FAILED' });
};

// ============ 文档转换为 PDF ============
router.post('/convert', handleOfficeUpload, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '未上传文件' });
    }

    const uploadedPath = req.file.path;
    const originalName = req.file.originalname;
    const outputDir = path.join(os.tmpdir(), 'webpdf-converted');
    let renamedPath;
    let pdfPath;

    try {
        if (!validateOfficeFile({ filePath: uploadedPath, originalName })) {
            return res.status(400).json({
                error: '文件内容与 Office 格式不匹配',
                code: 'INVALID_OFFICE_FILE'
            });
        }
        fs.mkdirSync(outputDir, { recursive: true });
        renamedPath = `${uploadedPath}${path.extname(originalName).toLowerCase()}`;
        fs.renameSync(uploadedPath, renamedPath);
        console.log(`[API] 开始转换: ${originalName}`);
        pdfPath = await convertToPdf(renamedPath, outputDir);
        const pdfBytes = sendPdf({ res, pdfPath, originalName });
        console.log(`[API] ✅ 转换完成: ${originalName} → PDF (${(pdfBytes / 1024).toFixed(1)} KB)`);
    } catch (error) {
        console.error(`[API] ❌ 转换失败: ${originalName}`, error.message);
        respondToConversionError({ res, error });
    } finally {
        cleanupFile(uploadedPath);
        cleanupFile(renamedPath);
        cleanupFile(pdfPath);
    }
});

export default router;
