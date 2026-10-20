const DEFAULT_WIDTH_PERCENT = 0.18;
const COORDINATE_PRECISION = 6;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const roundCoordinate = (value) => Number(value.toFixed(COORDINATE_PRECISION));

const assertValidGeometry = (pageRect, aspectRatio) => {
    if (!pageRect || pageRect.width <= 0 || pageRect.height <= 0) {
        throw new Error('Valid page dimensions are required');
    }
    if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
        throw new Error('A valid stamp aspect ratio is required');
    }
};

export const calculateStampPlacement = ({
    clientX,
    clientY,
    pageRect,
    aspectRatio,
    widthPercent = DEFAULT_WIDTH_PERCENT
}) => {
    assertValidGeometry(pageRect, aspectRatio);

    const safeWidth = clamp(widthPercent, 0.05, 0.8);
    const pageAspectRatio = pageRect.width / pageRect.height;
    const heightPercent = clamp((safeWidth / aspectRatio) * pageAspectRatio, 0.03, 0.8);
    const pointerX = (clientX - pageRect.left) / pageRect.width;
    const pointerY = (clientY - pageRect.top) / pageRect.height;

    return {
        xPercent: roundCoordinate(clamp(pointerX - safeWidth / 2, 0, 1 - safeWidth)),
        yPercent: roundCoordinate(clamp(pointerY - heightPercent / 2, 0, 1 - heightPercent)),
        widthPercent: roundCoordinate(safeWidth),
        heightPercent: roundCoordinate(heightPercent)
    };
};

export const createPlacedStamp = ({ id, sourceStamp, placement }) => ({
    id,
    stampId: sourceStamp.id,
    url: sourceStamp.url,
    ...placement,
    rotation: 0,
    ...REALISTIC_STAMP_PRESET
});
import { REALISTIC_STAMP_PRESET } from './stampAppearance.js';
