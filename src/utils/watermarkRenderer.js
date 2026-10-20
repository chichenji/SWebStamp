import { resolveWatermarkConfig } from './watermarkConfig.js';

const PERCENT = 100;
export const drawPageWatermark = ({ context, pageSize, asset }) => {
    if (!asset?.image) return;
    const config = resolveWatermarkConfig(asset.config);
    context.save();
    if (config.layout === 'single') {
        const x = pageSize.width * config.positionX / PERCENT;
        const y = pageSize.height * config.positionY / PERCENT;
        context.drawImage(asset.image, x - asset.image.width / 2, y - asset.image.height / 2);
    } else {
        context.fillStyle = context.createPattern(asset.image, 'repeat');
        context.fillRect(0, 0, pageSize.width, pageSize.height);
    }
    context.restore();
};
