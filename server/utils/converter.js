import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';
import process from 'node:process';
import { fileURLToPath } from 'url';
import {
    convertDocumentToPdf,
    getLibreOfficeCliPath,
    runLibreOfficeTask
} from './libreOfficeProcess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ 配置 ============
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const LOCAL_LIBRE_DIR = process.env.LIBREOFFICE_DIR || path.join(PROJECT_ROOT, 'libreoffice');

const LIBRE_VERSION = '26.2.1';
const DOWNLOAD_MIRRORS = [
    `https://mirrors.tuna.tsinghua.edu.cn/libreoffice/libreoffice/stable/${LIBRE_VERSION}/win/x86_64/LibreOffice_${LIBRE_VERSION}_Win_x86-64.msi`,
    `https://download.documentfoundation.org/libreoffice/stable/${LIBRE_VERSION}/win/x86_64/LibreOffice_${LIBRE_VERSION}_Win_x86-64.msi`,
];

// ============ 下载状态 (内存中) ============
let downloadState = {
    status: 'idle',     // 'idle' | 'downloading' | 'extracting' | 'done' | 'error'
    progress: 0,        // 0-100
    message: '',
    error: null,
};

export const getDownloadState = () => ({ ...downloadState });

export const resetDownloadState = () => {
    downloadState = { status: 'idle', progress: 0, message: '', error: null };
};

// ============ 递归查找文件 ============
const findFileRecursive = (dir, filename, maxDepth, currentDepth = 0) => {
    if (currentDepth >= maxDepth) return null;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) {
                return fullPath;
            }
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                const found = findFileRecursive(fullPath, filename, maxDepth, currentDepth + 1);
                if (found) return found;
            }
        }
    } catch { /* ignore permission errors */ }
    return null;
};

// ============ 查找 soffice.exe ============
export const findSoffice = () => {
    // 1. 环境变量指定
    if (process.env.LIBREOFFICE_PATH && fs.existsSync(process.env.LIBREOFFICE_PATH)) {
        return process.env.LIBREOFFICE_PATH;
    }

    // 2. 本地目录 (项目内的 libreoffice/)
    if (fs.existsSync(LOCAL_LIBRE_DIR)) {
        const found = findFileRecursive(LOCAL_LIBRE_DIR, 'soffice.exe', 5);
        if (found) return found;
    }

    // 3. 系统安装路径 (Windows)
    const platform = os.platform();
    if (platform === 'win32') {
        const systemPaths = [
            'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
            path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'LibreOffice', 'program', 'soffice.exe'),
        ];
        for (const p of systemPaths) {
            if (fs.existsSync(p)) return p;
        }
    } else if (platform === 'darwin') {
        const macPath = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
        if (fs.existsSync(macPath)) return macPath;
    }

    // 4. PATH
    return null;
};

export const isLibreOfficeAvailable = () => findSoffice() !== null;

// ============ HTTP 下载 (支持重定向) ============
const downloadFile = (url, destPath, maxRedirects = 5) => {
    return new Promise((resolve, reject) => {
        if (maxRedirects <= 0) {
            reject(new Error('重定向次数过多'));
            return;
        }

        const protocol = url.startsWith('https') ? https : http;

        const request = protocol.get(url, (response) => {
            // 处理重定向
            if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
                let redirectUrl = response.headers.location;
                if (redirectUrl.startsWith('/')) {
                    const parsed = new URL(url);
                    redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
                }
                response.resume();
                downloadFile(redirectUrl, destPath, maxRedirects - 1).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                response.resume();
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }

            const totalSize = parseInt(response.headers['content-length'], 10) || 0;
            let downloadedSize = 0;

            const fileStream = fs.createWriteStream(destPath);

            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (totalSize > 0) {
                    const percent = Math.round((downloadedSize / totalSize) * 100);
                    const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(1);
                    const totalMB = (totalSize / 1024 / 1024).toFixed(0);
                    downloadState.progress = Math.round(percent * 0.8); // 0-80% 用于下载
                    downloadState.message = `正在下载 LibreOffice... ${downloadedMB}MB / ${totalMB}MB (${percent}%)`;
                }
            });

            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close(() => resolve());
            });

            fileStream.on('error', (err) => {
                try { fs.unlinkSync(destPath); } catch { /* temporary file absent */ }
                reject(err);
            });
        });

        request.on('error', reject);
        request.setTimeout(600000, () => { // 10 分钟超时
            request.destroy();
            reject(new Error('下载超时，请检查网络'));
        });
    });
};

// ============ MSI 解压 ============
const extractMsi = (msiPath, targetDir) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 使用 msiexec /a 进行管理安装（仅解压，不注册系统组件）
        const absTarget = path.resolve(targetDir) + '\\';
        const cmd = `msiexec /a "${path.resolve(msiPath)}" /qn TARGETDIR="${absTarget}"`;

        console.log(`[Converter] 执行 MSI 提取: ${cmd}`);

        exec(cmd, { timeout: 600000 }, (error) => {
            if (error) {
                reject(new Error(`MSI 提取失败: ${error.message}`));
            } else {
                resolve();
            }
        });
    });
};

// ============ 自动下载 LibreOffice ============
export const downloadLibreOffice = async () => {
    if (downloadState.status === 'downloading' || downloadState.status === 'extracting') {
        console.log('[Converter] 下载已在进行中');
        return;
    }

    downloadState = { status: 'downloading', progress: 0, message: '准备下载...', error: null };

    const msiFilename = `LibreOffice_${LIBRE_VERSION}_Win_x86-64.msi`;
    const msiPath = path.join(os.tmpdir(), msiFilename);

    try {
        // 尝试每个镜像
        let downloadSuccess = false;
        for (let i = 0; i < DOWNLOAD_MIRRORS.length; i++) {
            const mirrorUrl = DOWNLOAD_MIRRORS[i];
            try {
                console.log(`[Converter] 尝试镜像 ${i + 1}/${DOWNLOAD_MIRRORS.length}: ${mirrorUrl}`);
                downloadState.message = `正在连接下载服务器 (镜像 ${i + 1})...`;
                await downloadFile(mirrorUrl, msiPath);
                downloadSuccess = true;
                console.log(`[Converter] 下载完成: ${msiPath}`);
                break;
            } catch (err) {
                console.warn(`[Converter] 镜像 ${i + 1} 失败:`, err.message);
                try { fs.unlinkSync(msiPath); } catch { /* temporary file absent */ }
            }
        }

        if (!downloadSuccess) {
            throw new Error('所有下载镜像均失败，请检查网络连接后重试');
        }

        // 解压
        downloadState.status = 'extracting';
        downloadState.progress = 82;
        downloadState.message = '正在解压安装 LibreOffice（可能需要 2-5 分钟）...';

        // 清理旧安装
        if (fs.existsSync(LOCAL_LIBRE_DIR)) {
            console.log('[Converter] 清理旧安装...');
            fs.rmSync(LOCAL_LIBRE_DIR, { recursive: true, force: true });
        }

        await extractMsi(msiPath, LOCAL_LIBRE_DIR);

        // 验证
        downloadState.progress = 95;
        downloadState.message = '正在验证安装...';

        const sofficePath = findSoffice();
        if (sofficePath) {
            try { fs.unlinkSync(msiPath); } catch { /* temporary file absent */ }

            downloadState = {
                status: 'done',
                progress: 100,
                message: 'LibreOffice 安装成功！可以开始转换文档了。',
                error: null
            };
            console.log(`[Converter] ✅ LibreOffice 安装完成: ${sofficePath}`);
        } else {
            throw new Error('安装完成但未找到 soffice.exe，请尝试手动安装 LibreOffice');
        }
    } catch (error) {
        try { fs.unlinkSync(msiPath); } catch { /* temporary file absent */ }
        downloadState = { status: 'error', progress: 0, message: '', error: error.message };
        console.error(`[Converter] ❌ 下载/安装失败:`, error.message);
        throw error;
    }
};

// ============ 文档转换 ============
export const convertToPdf = async (inputPath, outputDir) => {
    const sofficePath = findSoffice();
    if (!sofficePath) {
        const error = new Error('LIBRE_NOT_FOUND');
        error.code = 'LIBRE_NOT_FOUND';
        throw error;
    }

    console.log(`[Converter] 使用隔离配置转换: ${inputPath}`);
    try {
        const pdfPath = await convertDocumentToPdf({ sofficePath, inputPath, outputDirectory: outputDir });
        console.log(`[Converter] ✅ 转换成功: ${pdfPath}`);
        return pdfPath;
    } catch (error) {
        console.error('[Converter] 转换失败:', error.message);
        throw new Error(`文档转换失败: ${error.message}`);
    }
};

// ============ 检查可用性 ============
export const checkLibreOfficeAvailable = async () => {
    const sofficePath = findSoffice();
    if (!sofficePath) {
        return { available: false, downloadState: getDownloadState() };
    }

    try {
        const result = await runLibreOfficeTask({
            sofficePath: getLibreOfficeCliPath({ sofficePath }),
            commandArgs: ['--headless', '--version'],
            timeoutMs: 10_000
        });
        return { available: true, version: result.stdout.trim(), path: sofficePath };
    } catch (error) {
        return { available: false, path: sofficePath, error: error.message };
    }
};
