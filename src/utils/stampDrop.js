import { getStampDimensions } from './pdfDocument.js';
import { calculateStampPlacement } from './stampPlacement.js';
import { mapPointerToSource } from './scanEffect/scanGeometry.js';

export const getDroppedStampPlacement = async (event, widthPercent) => {
    const { stamp } = event.active.data.current;
    const { geometry } = event.over.data.current;
    const dimensions = await getStampDimensions(stamp.url);
    let point = { x: event.activatorEvent.clientX + event.delta.x, y: event.activatorEvent.clientY + event.delta.y };
    let pageRect = event.over.rect;
    if (geometry) {
        const sourcePoint = mapPointerToSource({
            targetX: (point.x - pageRect.left) / pageRect.width * geometry.targetWidth,
            targetY: (point.y - pageRect.top) / pageRect.height * geometry.targetHeight, geometry
        });
        pageRect = { left: 0, top: 0, width: geometry.sourceWidth, height: geometry.sourceHeight };
        point = { x: sourcePoint.xPercent * pageRect.width, y: sourcePoint.yPercent * pageRect.height };
    }
    return calculateStampPlacement({
        clientX: point.x,
        clientY: point.y,
        pageRect,
        aspectRatio: dimensions.aspectRatio,
        widthPercent
    });
};
