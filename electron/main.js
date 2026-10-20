import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { getSquirrelAction } from './squirrel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = path.join(__dirname, '..');

let mainWindow = null;
const SERVER_PORT = 3000;

function runSquirrelUpdate(args) {
    const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
    const child = spawn(updateExe, args, { detached: true, stdio: 'ignore' });
    child.unref();
}

function handleSquirrelEvent() {
    const action = getSquirrelAction(process.argv[1]);
    if (!action) return false;

    const exeName = path.basename(process.execPath);
    if (action === 'create-shortcut') {
        runSquirrelUpdate(['--createShortcut', exeName]);
    } else if (action === 'remove-shortcut') {
        runSquirrelUpdate(['--removeShortcut', exeName]);
    }

    setTimeout(() => app.quit(), 1000);
    return true;
}

const isSquirrelEvent = handleSquirrelEvent();

// ============ 确保 .env 存在 ============
function ensureEnv() {
    const envPath = path.join(APP_ROOT, '.env');
    if (!fs.existsSync(envPath)) {
        const secret = crypto.randomBytes(64).toString('hex');
        fs.writeFileSync(envPath, [
            `PORT=${SERVER_PORT}`,
            `NODE_ENV=production`,
            `JWT_SECRET=${secret}`,
            `ALLOWED_ORIGINS=http://localhost:${SERVER_PORT}`,
        ].join('\n'));
        console.log('[App] .env created');
    }
}

// ============ 在主进程内直接启动 Express 服务器 ============
async function startServer() {
    ensureEnv();

    // 设置环境变量
    process.env.PORT = String(SERVER_PORT);
    process.env.NODE_ENV = 'production';

    // LibreOffice 下载目录放在用户数据目录（可写区域）
    const libreDir = path.join(app.getPath('userData'), 'libreoffice');
    if (!fs.existsSync(libreDir)) fs.mkdirSync(libreDir, { recursive: true });
    process.env.LIBREOFFICE_DIR = libreDir;

    // 切换工作目录（让 dotenv 和 express.static 的相对路径正常工作）
    process.chdir(APP_ROOT);

    // 直接在进程内 import 服务器模块（无需 spawn 子进程）
    const serverPath = path.join(APP_ROOT, 'server', 'index.js');
    console.log(`[App] Importing server from: ${serverPath}`);
    await import(pathToFileURL(serverPath).href);
    console.log('[App] Express server started on port', SERVER_PORT);
}

// ============ 创建窗口 ============
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        title: 'SWebStamp - 文档盖章工具',
        icon: path.join(__dirname, '..', 'dist', 'favicon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false, // 先隐藏，加载完再显示
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);

    // 页面加载完成 → 显示窗口
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // 兜底：8 秒后无论如何都显示窗口（避免永远隐藏）
    setTimeout(() => {
        if (mainWindow && !mainWindow.isVisible()) {
            console.log('[Window] Force showing after timeout');
            mainWindow.show();
        }
    }, 8000);

    // 加载失败时自动重试
    let retryCount = 0;
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc) => {
        retryCount++;
        console.log(`[Window] Load failed (${retryCount}): ${errorDesc}`);
        if (retryCount < 10) {
            setTimeout(() => {
                if (mainWindow) mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
            }, 1000);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ============ IPC: Audit Log ============
const getLogPath = () => {
    const dPath = 'D:\\WebPDF_Data';
    try {
        if (fs.existsSync('D:\\')) {
            if (!fs.existsSync(dPath)) fs.mkdirSync(dPath, { recursive: true });
            return path.join(dPath, 'WebPDF_AuditLogs.json');
        }
    } catch { /* fallback */ }
    return path.join(app.getPath('documents'), 'WebPDF_AuditLogs.json');
};

ipcMain.handle('audit-log:save', async (event, record) => {
    try {
        const logPath = getLogPath();
        let logs = [];
        if (fs.existsSync(logPath)) {
            logs = JSON.parse(fs.readFileSync(logPath, 'utf-8') || '[]');
        }
        logs.unshift(record);
        if (logs.length > 1000) logs.pop();
        fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('audit-log:read', async () => {
    try {
        const logPath = getLogPath();
        if (fs.existsSync(logPath)) {
            return JSON.parse(fs.readFileSync(logPath, 'utf-8') || '[]');
        }
        return [];
    } catch { return []; }
});

// ============ App Lifecycle ============
if (!isSquirrelEvent) app.whenReady().then(async () => {
    try {
        await startServer();
    } catch (err) {
        console.error('[App] Server start failed:', err);
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
