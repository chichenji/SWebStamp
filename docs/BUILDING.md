# 开发、构建与发布

## 环境

- Node.js 22.12+ 或 Node.js 24，npm；使用锁文件安装依赖。
- Windows x64 安装器：.NET SDK 8、Electron 40、本地 `electron-winstaller` 工具。
- Office 转 PDF：可用的 LibreOffice。Windows 可用 `LIBREOFFICE_PATH` 指定 `soffice.exe`，不把其运行时提交到 Git。
- 浏览器回归：Python 3、`playwright` 包及本机 Chrome。

## 首次安装与运行

```powershell
npm ci
Copy-Item .env.example .env
npm run dev:all
```

`npm ci`、Electron 下载及原生依赖准备可能需要网络。现有安装器构建脚本在依赖与本地运行时已经准备好后，可复用它们完成打包；这不代表全新机器无需下载依赖。

## 自动化验证

在仓库根目录运行：

```powershell
node --test --test-timeout=60000 electron/squirrel.test.js server/utils/libreOfficeProcess.test.js server/utils/officeUploadPolicy.test.js src/utils/stampAppearance.test.js src/utils/stampPlacement.test.js src/utils/stampRenderer.test.js src/utils/scanEffect.test.js src/utils/watermarkRenderer.test.js
node node_modules/eslint/bin/eslint.js src scripts/watermark-browser-checks.js
node node_modules/vite/bin/vite.js build
```

当前这组测试为 38 项，覆盖安装事件、Office 隔离配置和上传策略、印章坐标与绘制、扫描像素 / 几何和水印布局。它不等同于所有浏览器功能或真实安装升级的端到端测试。

浏览器测试使用实际导入、切页、指针 / 键盘排序、水印设置和 PNG / PDF 下载；输出样本写到被忽略的 `uploads/watermark-check/`：

```powershell
python -m pip install playwright
```

先在一个终端启动开发服务：

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5183 --strictPort
```

在另一个终端运行：

```powershell
python scripts/page-watermark-regression.py http://127.0.0.1:5183
```

测试使用系统 Chrome；需要其他浏览器时应明确调整脚本，不静默跳过测试。

## Windows 安装器

```powershell
npm run dist
```

该命令先构建前端，再运行 `scripts/build-electron-installer.cjs`：

1. Electron Builder 生成 `release/win-unpacked/`，复用 `node_modules/electron/dist`。
2. .NET 按 `scripts/squirrel-installer/SWebStamp.nuspec` 生成 NuGet 包。
3. Squirrel 生成 Setup、完整升级包和 RELEASES 清单。

安装器版本来自 `package.json`，并传入 NuGet 元数据。发布时同步修改 `package.json` 和 `package-lock.json` 的根版本。以下产品身份必须保持：

| 项目 | 值 |
| --- | --- |
| npm 包名 | webpdf |
| Squirrel 包名 | SWebStamp |
| 应用标识 | com.swebstamp.tool |
| 可执行文件 | SWebStamp.exe |

输出示例：

```text
release/SWebStamp Setup 1.4.1.exe
release/SWebStamp-1.4.1-full.nupkg
release/SWebStamp-1.4.1-RELEASES
```

构建会重建 `release/win-unpacked/`、`release/squirrel-package/` 和 `release/squirrel-installer/` 工作目录，不能在其中存放用户文件。发布根目录中不同版本的独立安装器和完整包应保留。

`package.json` 中的旧 NSIS 配置不是当前发布入口，不要用它替换 Squirrel 后仍声称保持原覆盖升级链路。

## 安装包校验

```powershell
./scripts/verify-electron-installer.ps1 -PreviousVersions @('1.3.0', '1.3.1', '1.4.0')
```

此脚本要求本地 `release/` 中存在所列旧版本的完整包和 RELEASES。全新克隆不包含历史二进制，应先从可信历史存档准备对应文件。若只检查新包本体，可显式传入 `-PreviousVersions @()`；这不能替代升级兼容性检查。

脚本校验包版本、文件哈希、前端资源与关键运行代码，并调用原生 Squirrel 升级计算。它不会执行安装，也不代表已在用户机器上完成过覆盖升级。

还应检查 Setup 内嵌包与外部完整包一致、压缩数据 CRC、签名状态和安装器 SHA-256。当前 1.4.1 安装器未数字签名。

## GitHub 发布

源码通过普通 Git 提交上传；不使用强制推送覆盖已有远程历史。安装器、完整升级包、RELEASES 与校验说明作为对应版本的 GitHub Release 附件，不进入源码仓库。

发布前检查 `.env`、用户文件、数据库、真实印章、调试账号和本地开发记录均未进入提交或附件。不要用仓库公开性替代许可证决定，也不要把元数据验证描述为数字签名。
