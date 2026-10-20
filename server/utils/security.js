// Security utilities
import crypto from 'crypto';
import path from 'path';

// Check if JWT secret is strong enough
export const validateJWTSecret = (secret) => {
    const minLength = 32;
    const weakSecrets = [
        'your-secret-key',
        'secret',
        'password',
        'change-this',
        'your-super-secret-key-change-this'
    ];

    if (!secret || secret.length < minLength) {
        return {
            valid: false,
            message: `JWT_SECRET must be at least ${minLength} characters long`
        };
    }

    if (weakSecrets.some(weak => secret.toLowerCase().includes(weak))) {
        return {
            valid: false,
            message: 'JWT_SECRET contains weak or default values. Please use a strong random secret.'
        };
    }

    return { valid: true };
};

// Generate a strong random secret
export const generateStrongSecret = () => {
    return crypto.randomBytes(64).toString('hex');
};

// Sanitize filename to prevent path traversal
export const sanitizeFilename = (filename) => {
    // Remove any path components
    const basename = path.basename(filename);

    // Remove special characters except dots, hyphens, and underscores
    const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Limit length
    const maxLength = 255;
    if (sanitized.length > maxLength) {
        const ext = path.extname(sanitized);
        const name = path.basename(sanitized, ext);
        return name.substring(0, maxLength - ext.length) + ext;
    }

    return sanitized;
};

// Generate unique filename with UUID
export const generateUniqueFilename = (originalFilename) => {
    const ext = path.extname(originalFilename);
    const uuid = crypto.randomUUID();
    return `${uuid}${ext}`;
};

// Validate file type by MIME type
export const validateFileType = (mimetype, allowedTypes) => {
    return allowedTypes.includes(mimetype);
};

// Validate file extension
export const validateFileExtension = (filename, allowedExtensions) => {
    const ext = path.extname(filename).toLowerCase();
    return allowedExtensions.includes(ext);
};

// Check file size
export const validateFileSize = (size, maxSize) => {
    return size <= maxSize;
};

// File upload configuration
export const FILE_UPLOAD_CONFIG = {
    PDF: {
        maxSize: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: ['application/pdf'],
        allowedExtensions: ['.pdf']
    },
    IMAGE: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
        allowedExtensions: ['.png', '.jpg', '.jpeg']
    }
};
