import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
    getOfficeUploadErrorResponse,
    hasValidOfficeSignature,
    isAllowedOfficeUpload,
    validateOfficeFile
} from './officeUploadPolicy.js';

test('accepts xlsx uploads with generic browser MIME types', () => {
    assert.equal(isAllowedOfficeUpload({
        originalname: '报表.xlsx',
        mimetype: 'application/octet-stream'
    }), true);
    assert.equal(isAllowedOfficeUpload({
        originalname: '报表.xlsx',
        mimetype: 'application/zip'
    }), true);
});

test('rejects unsupported extensions even with a generic MIME type', () => {
    assert.equal(isAllowedOfficeUpload({
        originalname: '程序.exe',
        mimetype: 'application/octet-stream'
    }), false);
});

test('validates OOXML and legacy Office file signatures', () => {
    assert.equal(hasValidOfficeSignature({
        originalName: '报表.xlsx',
        header: Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00])
    }), true);
    assert.equal(hasValidOfficeSignature({
        originalName: '旧报表.xls',
        header: Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])
    }), true);
});

test('rejects files whose content does not match the Office extension', () => {
    assert.equal(hasValidOfficeSignature({
        originalName: '伪装.xlsx',
        header: Buffer.from('not an office file')
    }), false);
});

test('validates the uploaded file from disk before conversion', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'swebstamp-upload-test-'));
    const filePath = path.join(directory, 'upload');
    try {
        fs.writeFileSync(filePath, Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]));
        assert.equal(validateOfficeFile({ filePath, originalName: '报表.xlsx' }), true);
        assert.equal(validateOfficeFile({ filePath, originalName: '报表.xls' }), false);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test('maps upload policy errors to safe client responses', () => {
    assert.deepEqual(getOfficeUploadErrorResponse({ code: 'LIMIT_FILE_SIZE' }), {
        status: 413,
        body: { error: '文件超过 50MB 限制', code: 'FILE_TOO_LARGE' }
    });
    assert.deepEqual(getOfficeUploadErrorResponse(new Error('invalid MIME')), {
        status: 400,
        body: { error: '不支持的 Office 文件', code: 'INVALID_OFFICE_FILE' }
    });
});
