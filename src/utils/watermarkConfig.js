export const DEFAULT_WATERMARK = Object.freeze({
    type: 'text', text: '在此输入水印内容', imageUrl: null, layout: 'array',
    opacity: 0.15, angle: -45, density: 1.5, color: '#888888', fontSize: 36,
    positionX: 50, positionY: 50
});

export const resolveWatermarkConfig = config => ({ ...DEFAULT_WATERMARK, ...config });
