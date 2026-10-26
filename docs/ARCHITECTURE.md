# 架构说明

## 入口

- `src/main.jsx` / `src/App.jsx`：React 19、HashRouter 与共享状态。
- `src/pages/Home.jsx`：编辑器、工具浮窗与导出编排。
- `server/index.js` / `server/routes.js`：Express 本地服务、静态资源和 Office 转换接口。
- `electron/main.js` / `electron/preload.js`：桌面窗口、本地服务及审计记录通信。
- `electron/squirrel.js`：安装生命周期事件映射。`--squirrel-firstrun` 必须正常启动应用。

## 页面与图层

`AppContext` 组合文档、印章库、已放置印章、水印、骑缝章及扫描状态。当前页与扫描单页覆盖均以稳定页面 ID 保存，排序不改变页面身份。

- `PageThumbnailSidebar` / `PageThumbnailCard`：点击切页、当前页高亮与排序。
- `DocumentPreview` / `DocumentPage`：当前页、缩放、预览图层和印章交互。
- `useStampInteraction`：移动、缩放、旋转及扫描 A4 / 倾斜后的坐标映射。
- `useScanSettings`：全局参数、单页覆盖、原图对比及当前页 ID。
- `useImageAdjustments`：当前页 / 全部已导入页的底图参数更新与重置；参数存于各页的 `imageAdjustments`，不覆盖原图地址。

## 共用合成流程

`pageAssets` 准备水印和骑缝切片，`scanComposer.composeScanPageCanvas` 合成页面：

1. 加载原图，仅对底图应用 `imageAdjustment` 定义的亮度、对比度、饱和度、去色、反相和复古滤镜，再绘制水印。
2. 若开启印章保色，先转换底图和水印色调。
3. 绘制普通印章与骑缝章。
4. 未开启保色时，对全部图层转换色调。
5. 执行 A4 适配、倾斜、纸张纹理、颗粒、阴影和模糊。

普通预览的透明水印图层与导出共用 `watermarkRenderer.drawPageWatermark`；图案由 `watermarkHelper` 按实际字形四边度量生成未旋转内容。单行只绘制一处；阵列按内容宽高加间距排列，再绕页面中心旋转整个行列坐标系。绘制基于原图逻辑尺寸，再统一应用质量缩放。

普通底图和缩略图使用与 Canvas 相同的图片滤镜定义。原图对比临时隐藏预览中的底图调整和扫描效果，不改导出参数；水印与印章不受底图滤镜影响。

`scanWorker` 在后台执行像素处理；过期扫描预览可取消，纸纹按页面 ID 与归一化坐标确定。PDF 与图片导出都经过同一 Canvas 管线。

## Office 转换

上传边界由 `officeUploadPolicy` 检查扩展名、浏览器 MIME 与 ZIP / OLE 文件签名。`converter` 查找 LibreOffice，并通过 `libreOfficeProcess` 使用隔离的临时用户配置运行转换，结束后清理配置目录。

Windows 检查优先使用同目录 `soffice.com`，避免图形入口影响版本探测。转换仍依赖 LibreOffice 对源文档的排版能力。

## 存储与安全

编辑中的文档、普通盖章坐标与骑缝章属于会话状态；印章库、全局印章默认样式、水印配置与启用状态、导出偏好使用本地存储。`PreferenceSession` 为参数更新提供同步合并与保存结果通知；印章样式只包含大小、角度和外观，按字段白名单过滤文档及素材标识。损坏记录保留到显式重置，写入失败保留当前编辑并提供重试。

当前 HTTP 服务没有接入历史认证模块，不应当作已加固的公网服务。验证元数据不是可信数字签名，详见 [安全说明](../SECURITY.md)。

## 发布边界

Git 仅保存源码、锁文件、测试、构建脚本与文档。依赖、LibreOffice、用户文件、数据库、本地开发记忆和发布二进制不入库；安装包通过 GitHub Release 分发。
