import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    saveAuditLog: (record) => ipcRenderer.invoke('audit-log:save', record),
    getAuditLogs: () => ipcRenderer.invoke('audit-log:read')
});
