const REFERENCE_PAGE_WIDTH = 800;

export const processCanvasStage = async ({ canvas, config, seed, stage, signal }) => {
    signal?.throwIfAborted();
    const context = canvas.getContext('2d');
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const worker = new Worker(new URL('./scanWorker.js', import.meta.url), { type: 'module' });
    let onAbort;
    try {
        const result = await new Promise((resolve, reject) => {
            onAbort = () => reject(signal.reason);
            signal?.addEventListener('abort', onAbort, { once: true });
            worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data.data);
            worker.onerror = event => reject(new Error(`扫描处理失败：${event.message}`));
            worker.postMessage({ data: pixels.data, width: canvas.width, height: canvas.height,
                scaleFactor: canvas.width / REFERENCE_PAGE_WIDTH, config, seed, stage }, [pixels.data.buffer]);
        });
        context.putImageData(new ImageData(result, canvas.width, canvas.height), 0, 0);
    } finally {
        signal?.removeEventListener('abort', onAbort);
        worker.terminate();
    }
};
