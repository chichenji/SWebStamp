import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const HEADER_BYTES = 8;
const OOXML_EXTENSIONS = new Set(['.docx', '.xlsx', '.pptx']);
const LEGACY_EXTENSIONS = new Set(['.doc', '.xls', '.ppt']);
const SUPPORTED_EXTENSIONS = new Set([...OOXML_EXTENSIONS, ...LEGACY_EXTENSIONS]);
const GENERIC_MIMES = new Set(['application/octet-stream', 'application/zip', 'application/x-zip-compressed']);
const OFFICE_MIMES = new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint'
]);
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
const OLE_SIGNATURE = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
const FILE_TOO_LARGE_RESPONSE = Object.freeze({
    status: 413,
    body: { error: '文件超过 50MB 限制', code: 'FILE_TOO_LARGE' }
});
const INVALID_FILE_RESPONSE = Object.freeze({
    status: 400,
    body: { error: '不支持的 Office 文件', code: 'INVALID_OFFICE_FILE' }
});

const getExtension = fileName => path.extname(fileName).toLowerCase();
const startsWith = (header, signature) => (
    header.length >= signature.length && header.subarray(0, signature.length).equals(signature)
);

export const isAllowedOfficeUpload = ({ originalname, mimetype }) => {
    const extension = getExtension(originalname);
    if (!SUPPORTED_EXTENSIONS.has(extension)) return false;
    if (OFFICE_MIMES.has(mimetype)) return true;
    if (!GENERIC_MIMES.has(mimetype)) return false;
    return mimetype !== 'application/zip' || OOXML_EXTENSIONS.has(extension);
};

export const hasValidOfficeSignature = ({ originalName, header }) => {
    const extension = getExtension(originalName);
    if (OOXML_EXTENSIONS.has(extension)) return startsWith(header, ZIP_SIGNATURE);
    if (LEGACY_EXTENSIONS.has(extension)) return startsWith(header, OLE_SIGNATURE);
    return false;
};

export const validateOfficeFile = ({ filePath, originalName }) => {
    const descriptor = fs.openSync(filePath, 'r');
    try {
        const header = Buffer.alloc(HEADER_BYTES);
        const bytesRead = fs.readSync(descriptor, header, 0, HEADER_BYTES, 0);
        return hasValidOfficeSignature({ originalName, header: header.subarray(0, bytesRead) });
    } finally {
        fs.closeSync(descriptor);
    }
};

export const getOfficeUploadErrorResponse = error => (
    error?.code === 'LIMIT_FILE_SIZE' ? FILE_TOO_LARGE_RESPONSE : INVALID_FILE_RESPONSE
);
