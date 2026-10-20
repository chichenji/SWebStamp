// API Configuration
// Automatically detects the API base URL based on the environment

const getApiBaseUrl = () => {
    // In production (when served from the same server), use relative URLs
    if (import.meta.env.PROD) {
        return '';
    }

    // In development, use localhost
    return 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: `${API_BASE_URL}/api/auth/login`,
        REGISTER: `${API_BASE_URL}/api/auth/register`,
    },
    STAMPS: {
        LIST: `${API_BASE_URL}/api/stamps`,
        UPLOAD: `${API_BASE_URL}/api/upload/stamp`,
        DELETE: (id) => `${API_BASE_URL}/api/stamps/${id}`,
    },
    FILES: {
        SAVE: `${API_BASE_URL}/api/files`,
    },
    LOGS: {
        CREATE: `${API_BASE_URL}/api/logs`,
    },
    CONVERT: {
        UPLOAD: `${API_BASE_URL}/api/convert`,
        CHECK: `${API_BASE_URL}/api/convert/check`,
        DOWNLOAD: `${API_BASE_URL}/api/convert/download`,
        DOWNLOAD_STATUS: `${API_BASE_URL}/api/convert/download-status`,
        DOWNLOAD_RESET: `${API_BASE_URL}/api/convert/download-reset`,
    },
};
