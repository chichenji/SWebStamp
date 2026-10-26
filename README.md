# SWebStamp

本地文档盖章工作台，支持 PDF、图片和 Office 文档导入，拖放印章、骑缝章、水印、扫描件效果，以及 PDF / 图片导出。

当前版本：**1.4.3**。桌面安装器面向 Windows x64，使用 Electron 40 和 Squirrel。

1.4.3 包含印章与水印的全局参数记忆，以及整行水印旋转、自适应水印间距、页面图片调整和 MIT 开源信息。

## 下载与升级

下载 [v1.4.3 安装包](https://github.com/chichenji/SWebStamp/releases/tag/v1.4.3)，详见 [1.4.3 升级说明](docs/releases/1.4.3.md)。本地构建输出为 `release/SWebStamp Setup 1.4.3.exe`。

安装前先导出当前文档并关闭旧版，在同一 Windows 用户账号下运行安装包。Squirrel 版 1.3.0 / 1.3.1 / 1.4.0 / 1.4.1 / 1.4.2 可覆盖升级，无需先卸载。当前不提供联网自动更新。

安装包未数字签名，Windows 可能显示未知发布者提示。旧 NSIS、Inno Setup、绿色版与 Squirrel 的跨安装器迁移未验证。

## 功能

- 导入 PDF 和图片；通过本机 LibreOffice 将 Word、Excel、PowerPoint 转换为 PDF。
- 点击左侧缩略图切页，拖动、键盘或按钮调整页面顺序。
- 从印章库拖放盖章，移动、缩放、旋转，并调整透明度、亮度、对比度、饱和度及正片叠底。
- 全局印章样式记忆：调整任一印章大小、角度或外观后自动记忆为全局默认样式，不同文件盖章或换用不同印章素材均自动继承相同比例与质感，不自动摆放历史印章。
- 多页骑缝章；文字 / 图片水印支持单行（每页一处）和阵列布局。
- 阵列水印整体按行旋转，长文字及大字号按实际字形测量，后续水印随内容宽度向右排列。
- 水印配置全局持久化：完整保存水印类型、内容、图片、角度、透明度与排布；支持“移除水印”保留参数、“应用水印”重新启用与“恢复默认”；重启自动延续启用状态。
- 本地存储韧性与隐私安全：参数纯本地储存（localStorage），不上传任何私有文件或素材；存储写入失败或数据损坏时提供明确提示、重试与重置入口。
- 页面图片可调亮度、对比度、饱和度、去色、反相和复古色调，支持单页 / 全部已导入页及原图对比。
- 真实影印、清晰黑白、彩色扫描，支持纸纹、底灰、颗粒、阴影、A4 适配及印章保色。
- 导出多页 PDF 或逐页图片，支持质量选择、编辑权限密码和本地导出记录。

页面会先栅格化再合成导出，不保证保留原 PDF 的可搜索文字、矢量结构、表单、书签或数字签名。扫描效果不是 OCR，也不会恢复原文件缺失的细节。

## 本地开发

需要 Node.js 22.12+ 或 Node.js 24、npm。Office 转换另需可用的 LibreOffice；纯 PDF / 图片编辑不需要它。

```powershell
npm ci
Copy-Item .env.example .env
npm run dev:all
```

开发页面通常为 `http://localhost:5173`，后端为 `http://localhost:3000`。如果提示端口占用，请按 Vite 输出访问实际端口；本地服务应仅用于可信环境。

`.env.example` 不包含真实密钥。使用相关配置时请在本地生成随机值，不要提交 `.env`。当前工作台没有登录门禁，不能依据历史认证组件认为 HTTP 接口已受保护。

生产资源本地运行：

```powershell
npm run build
npm start
```

在 `http://localhost:3000` 访问构建后的应用。Windows Office 转换可使用系统 LibreOffice，或以 `LIBREOFFICE_PATH` 指定其 `soffice.exe` 路径；应用也提供下载入口，下载需要联网。

## 检查与构建

```powershell
node node_modules/eslint/bin/eslint.js src scripts/watermark-browser-checks.js
$testFiles = @(rg --files src server electron -g '*.test.js')
node --test --test-timeout=60000 @testFiles
node node_modules/vite/bin/vite.js build
```

命令在 PowerShell 中枚举源码测试，覆盖安装、Office 转换、印章、扫描、水印排布、页面图片调整及参数持久化。

Windows 安装器构建还需 .NET SDK 8 和本地 Electron 依赖：

```powershell
npm run dist
```

安装器和升级包输出到 `release/`，不纳入 Git。具体依赖、验证和发布流程见 [构建与发布指南](docs/BUILDING.md)。

## 仓库结构

```text
src/                         前端组件、状态与 Canvas 合成
server/                      本地 Office 转换 HTTP 服务
electron/                    桌面主进程、预加载与安装生命周期
scripts/                     安装器构建、校验及浏览器回归
docs/                        架构、构建、发布与升级说明
USER_GUIDE.md                使用手册
SECURITY.md                  隐私、安全边界及已知限制
```

仓库不包含用户上传、数据库、真实环境配置、本地印章素材、LibreOffice 运行时、依赖目录或历史压缩包。旧部署说明和旧安装器脚本仅在原工作目录保留，不作为当前维护入口。

## 文档

- [使用指南](USER_GUIDE.md)
- [架构说明](docs/ARCHITECTURE.md)
- [构建与发布](docs/BUILDING.md)
- [版本记录](docs/CHANGELOG.md)
- [1.4.1 升级说明](docs/releases/1.4.1.md)
- [1.4.2 升级说明](docs/releases/1.4.2.md)
- [1.4.3 升级说明](docs/releases/1.4.3.md)
- [安全说明](SECURITY.md)

## 开源授权

本项目原创代码与文档采用 [MIT License](LICENSE)，版权署名为 `Copyright (c) 2026 chichenji`。

允许商业使用、修改、复制和分发，但必须保留版权及许可声明；软件按原样提供，不作担保。完整条款以 LICENSE 文件为准。

第三方依赖及随附组件适用其各自许可证。本地印章、用户上传文档和其他私人素材不包含在仓库中，本项目的开源授权不授予这些素材的使用权。
