import pdfjsLib from './pdfRuntime.js';

const VERIFICATION_KEY_MATERIAL = 'WEBPDF_SECURE_VERIFICATION_KEY_2026';
const VERIFICATION_SALT = 'WEBPDF_SALT';
const KEY_DERIVATION_ITERATIONS = 100000;
const IV_LENGTH = 12;
const AUDIT_LOG_LIMIT = 100;

export const getMachineId = () => {
    let machineId = localStorage.getItem('device_machine_id');
    if (!machineId) {
        machineId = crypto.randomUUID();
        localStorage.setItem('device_machine_id', machineId);
    }
    return machineId.toUpperCase();
};

const getBrowserAuditLogs = () => JSON.parse(localStorage.getItem('export_audit_log') || '[]');

const appendAuditLog = async (record) => {
    if (window.electron?.saveAuditLog) {
        await window.electron.saveAuditLog(record);
        return;
    }
    const logs = [record, ...getBrowserAuditLogs()].slice(0, AUDIT_LOG_LIMIT);
    localStorage.setItem('export_audit_log', JSON.stringify(logs));
};

export const getAuditLogs = async () => (
    window.electron?.getAuditLogs ? window.electron.getAuditLogs() : getBrowserAuditLogs()
);

export const checkAuditLog = async (hash) => {
    const logs = await getAuditLogs();
    return logs.find(log => log.hash === hash) || null;
};

const getCryptoKey = async () => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(VERIFICATION_KEY_MATERIAL),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: encoder.encode(VERIFICATION_SALT), iterations: KEY_DERIVATION_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

const bytesToBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value) => Uint8Array.from(atob(value), character => character.charCodeAt(0));

const encryptData = async (data) => {
    const key = await getCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return bytesToBase64(combined);
};

export const decryptData = async (base64Value) => {
    const combined = base64ToBytes(base64Value);
    const key = await getCryptoKey();
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: combined.slice(0, IV_LENGTH) },
        key,
        combined.slice(IV_LENGTH)
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
};

const sha256 = async (message) => {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
    return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
};

export const createVerificationPacket = async ({ documents, filename }) => {
    const timestamp = new Date().toISOString();
    const hash = await sha256(documents.map(document => document.id + document.name).join('|') + timestamp);
    const machineId = getMachineId();
    const verificationData = {
        hash: hash.substring(0, 32).toUpperCase(),
        timestamp: timestamp.replace('T', ' ').substring(0, 19),
        machineId,
        fullHash: hash
    };
    const encryptedToken = await encryptData({ h: hash, t: timestamp, m: machineId, v: '1.0' });
    await appendAuditLog({ hash, timestamp, filename, machineId });
    return { verificationData, encryptedToken };
};

const readFileBuffer = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
});

const verifyMetadata = async (info) => {
    const token = info?.Subject?.match(/^Verified:\s*(.+)$/)?.[1];
    if (!token) return { isValid: false, error: 'No verification token found' };
    const data = await decryptData(token);
    return { isValid: true, data, auditLog: await checkAuditLog(data.h) };
};

export const verifyPdfFile = async (file) => {
    try {
        const pdf = await pdfjsLib.getDocument({ data: await readFileBuffer(file) }).promise;
        const { info } = await pdf.getMetadata();
        return await verifyMetadata(info);
    } catch (error) {
        if (error.name === 'PasswordException') {
            return { isValid: false, error: 'Document is password locked and cannot be verified without opening.' };
        }
        return { isValid: false, error: 'Invalid PDF structure or verification token' };
    }
};
