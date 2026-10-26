const getBrowserStorage = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage;
        }
    } catch {
        // Storage access denied or SecurityError in sandboxed environment
    }
    return null;
};

export const resolveStorage = (injectedStorage) => {
    if (injectedStorage) return injectedStorage;
    return getBrowserStorage();
};

export const readStorageItem = (key, storage) => {
    const target = resolveStorage(storage);
    if (!target) {
        return { ok: false, error: '本地存储不可用或受安全策略限制', raw: null };
    }
    try {
        const raw = target.getItem(key);
        return { ok: true, raw: raw ?? null, error: null };
    } catch (error) {
        return { ok: false, error: error.message || '读取本地存储失败', raw: null };
    }
};

const formatWriteError = (error) => {
    const isQuota = error?.name === 'QuotaExceededError' || error?.code === 22;
    if (isQuota) {
        return '存储空间不足（图片过大或配额超限）';
    }
    return error?.message || '写入本地存储失败';
};

export const writeStorageItem = (key, value, storage) => {
    const target = resolveStorage(storage);
    if (!target) {
        return { ok: false, error: '本地存储不可用或受安全策略限制' };
    }
    try {
        target.setItem(key, value);
        return { ok: true, error: null };
    } catch (error) {
        return { ok: false, error: formatWriteError(error) };
    }
};
