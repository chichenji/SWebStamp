import { jsPDF } from 'jspdf';
import { createVerificationPacket } from './documentSecurity.js';
import { QUALITY_PRESETS } from './pdfDocument.js';
import { prepareAssets } from './pageAssets.js';
export { prepareAssets } from './pageAssets.js';
import { composeScanPageCanvas } from './scanEffect/scanComposer.js';

const PDF_POINTS_PER_PIXEL = 0.75;
const DOWNLOAD_INTERVAL_MS = 200;
const A4_PORTRAIT_WIDTH_PT = 595.28;
const A4_PORTRAIT_HEIGHT_PT = 841.89;

const getPreset = (qualityPreset) => QUALITY_PRESETS[qualityPreset] || QUALITY_PRESETS.balanced;
const getMimeType = (preset) => preset.format === 'JPEG' ? 'image/jpeg' : 'image/png';
const getExtension = (preset) => preset.format === 'JPEG' ? 'jpg' : 'png';
const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

export const composePageCanvas = async (options) => {
    return composeScanPageCanvas(options);
};

const getPdfPageSize = (canvas, scanConfig) => {
    if (scanConfig && scanConfig.enabled && scanConfig.fitToA4) {
        const isLandscape = canvas.width >= canvas.height;
        return {
            width: isLandscape ? A4_PORTRAIT_HEIGHT_PT : A4_PORTRAIT_WIDTH_PT,
            height: isLandscape ? A4_PORTRAIT_WIDTH_PT : A4_PORTRAIT_HEIGHT_PT
        };
    }
    return {
        width: canvas.width * PDF_POINTS_PER_PIXEL,
        height: canvas.height * PDF_POINTS_PER_PIXEL
    };
};

const getPdfConfig = ({ pageSize, password }) => {
    const config = {
        orientation: pageSize.width > pageSize.height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pageSize.width, pageSize.height]
    };
    if (password) {
        config.encryption = {
            userPassword: '',
            ownerPassword: password,
            userPermissions: ['print', 'copy'],
            encryptionAlgorithm: 'aes',
            keyLength: 128
        };
    }
    return config;
};

const applyVerificationMetadata = (pdf, packet) => {
    if (!packet) return;
    pdf.setProperties({
        title: 'Verified Document',
        subject: `Verified: ${packet.encryptedToken}`,
        keywords: `Verified, ${packet.encryptedToken}`,
        creator: `WebPDF Tool (${packet.verificationData.machineId})`,
        creationDate: new Date()
    });
};

const drawVerificationText = ({ pdf, packet, pageSize }) => {
    if (!packet) return;
    const data = packet.verificationData;
    pdf.saveGraphicsState();
    pdf.setGState(new pdf.GState({ opacity: 0.01 }));
    pdf.setFontSize(4);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`VERIFY: [${data.hash}]  TIME: [${data.timestamp}]  DEV: [${data.machineId}]`, 10, pageSize.height - 10);
    pdf.restoreGraphicsState();
};

const getPageOptions = ({ documents, placedStamps, preset, assets, crossPageStamp, index, settings }) => ({
    pageDoc: documents[index],
    stamps: placedStamps[documents[index].id] || [],
    index,
    pageCount: documents.length,
    preset,
    assets,
    crossPageStamp,
    scanConfig: settings?.getPageScanConfig
        ? settings.getPageScanConfig(documents[index].id)
        : settings?.scanConfig
});

export const exportPdf = async ({ documents, placedStamps, crossPageStamp, watermarkConfig, settings = {} }) => {
    if (documents.length === 0) return;
    const preset = getPreset(settings.qualityPreset);
    const filename = `document-${getTimestamp()}.pdf`;
    const assets = await prepareAssets({ watermarkConfig, crossPageStamp, pageCount: documents.length });
    const packet = settings.enableVerification === false
        ? null
        : await createVerificationPacket({ documents, filename });
    let pdf = null;

    for (let index = 0; index < documents.length; index += 1) {
        if (settings.onProgress) {
            await settings.onProgress({
                current: index + 1,
                total: documents.length,
                percent: Math.round((index / documents.length) * 100),
                message: `正在生成第 ${index + 1} / ${documents.length} 页 PDF...`
            });
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        const pageOptions = getPageOptions({ documents, placedStamps, preset, assets, crossPageStamp, index, settings });
        const canvas = await composePageCanvas(pageOptions);
        const pageSize = getPdfPageSize(canvas, pageOptions.scanConfig);
        if (!pdf) {
            pdf = new jsPDF(getPdfConfig({ pageSize, password: settings.password }));
            applyVerificationMetadata(pdf, packet);
        } else {
            pdf.addPage([pageSize.width, pageSize.height], pageSize.width > pageSize.height ? 'landscape' : 'portrait');
        }
        pdf.addImage(canvas.toDataURL(getMimeType(preset), preset.jpegQuality), preset.format, 0, 0, pageSize.width, pageSize.height);
        drawVerificationText({ pdf, packet, pageSize });
    }
    pdf.save(filename);
    settings.onProgress?.({ current: documents.length, total: documents.length, percent: 100, message: 'PDF 已生成' });
};

const downloadDataUrl = ({ dataUrl, filename }) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
};

export const exportImages = async ({ documents, placedStamps, crossPageStamp, watermarkConfig, settings = {} }) => {
    if (documents.length === 0) return;
    const preset = getPreset(settings.qualityPreset);
    const assets = await prepareAssets({ watermarkConfig, crossPageStamp, pageCount: documents.length });
    const timestamp = getTimestamp();

    for (let index = 0; index < documents.length; index += 1) {
        if (settings.onProgress) {
            await settings.onProgress({
                current: index + 1,
                total: documents.length,
                percent: Math.round((index / documents.length) * 100),
                message: `正在导出第 ${index + 1} / ${documents.length} 页图片...`
            });
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        const pageOptions = getPageOptions({ documents, placedStamps, preset, assets, crossPageStamp, index, settings });
        const canvas = await composePageCanvas(pageOptions);
        downloadDataUrl({
            dataUrl: canvas.toDataURL(getMimeType(preset), preset.jpegQuality),
            filename: `document_${timestamp}_page_${index + 1}.${getExtension(preset)}`
        });
        await new Promise(resolve => setTimeout(resolve, DOWNLOAD_INTERVAL_MS));
    }
    settings.onProgress?.({ current: documents.length, total: documents.length, percent: 100, message: '图片已生成' });
};
