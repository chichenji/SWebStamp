export class PreferenceSession {
    constructor({ storageKey, storage, loadFn, saveFn, defaultData, extractFn, preparePayload }) {
        this.storageKey = storageKey;
        this.storage = storage;
        this.loadFn = loadFn;
        this.saveFn = saveFn;
        this.defaultData = defaultData;
        this.extractFn = extractFn;
        this.preparePayload = preparePayload ?? ((data) => data);

        const initial = this.loadFn(this.storage);
        this.status = initial.status;
        this.error = initial.error;
        this.isCorrupt = initial.status === 'corrupt';
        this.readDenied = initial.status === 'error';
        this.data = initial.preferences ?? initial.config ?? defaultData;
        this.enabled = initial.enabled ?? false;
        this.listeners = new Set();
    }

    getState() {
        return {
            data: this.data,
            enabled: this.enabled,
            status: this.status,
            error: this.error,
            isCorrupt: this.isCorrupt,
            readDenied: this.readDenied
        };
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    _notify() {
        for (const listener of this.listeners) {
            listener();
        }
    }

    _handleBlockedWrite() {
        if (this.isCorrupt) {
            this.status = 'corrupt';
            if (!this.error) {
                this.error = '本地存储数据损坏（已保留原数据，未覆盖保存）';
            } else if (!this.error.includes('保留原数据')) {
                this.error = `${this.error}（已保留原数据，未覆盖保存）`;
            }
            this._notify();
            return { ok: false, status: 'corrupt', error: this.error };
        }
        if (this.readDenied) {
            this.status = 'error';
            if (!this.error) {
                this.error = '本地存储不可用或读取受限，未覆盖保存';
            } else if (!this.error.includes('未覆盖保存')) {
                this.error = `${this.error}（未覆盖保存）`;
            }
            this._notify();
            return { ok: false, status: 'error', error: this.error };
        }
        return null;
    }

    _executeSave() {
        const payload = this.preparePayload(this.data, this.enabled);
        const result = this.saveFn(payload, this.storage);
        this.status = result.ok ? 'saved' : 'error';
        this.error = result.ok ? null : result.error;
        this._notify();
        return result;
    }

    update(updates) {
        this.data = this.extractFn(this.data, updates);
        const blocked = this._handleBlockedWrite();
        if (blocked) return blocked;
        return this._executeSave();
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
        const blocked = this._handleBlockedWrite();
        if (blocked) return blocked;
        return this._executeSave();
    }

    reset(defaultPayload) {
        this.isCorrupt = false;
        this.readDenied = false;
        this.data = this.defaultData;
        if (defaultPayload && defaultPayload.enabled !== undefined) {
            this.enabled = Boolean(defaultPayload.enabled);
        }
        return this._executeSave();
    }

    retry() {
        if (this.isCorrupt) {
            return this._handleBlockedWrite();
        }
        if (this.readDenied) {
            const recheck = this.loadFn(this.storage);
            if (recheck.status === 'error') {
                this.error = recheck.error;
                this._notify();
                return { ok: false, error: recheck.error };
            }
            this.readDenied = false;
            this.isCorrupt = recheck.status === 'corrupt';
            if (this.isCorrupt) {
                this.error = recheck.error;
                return this._handleBlockedWrite();
            }
        }
        return this._executeSave();
    }
}
