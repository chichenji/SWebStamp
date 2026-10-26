import { REALISTIC_STAMP_PRESET } from './stampAppearance.js';

const DEFAULT_WIDTH_PERCENT = 0.18;
const COORDINATE_PRECISION = 6;
const MIN_WIDTH = 0.05;
const MAX_WIDTH = 0.8;
const MIN_HEIGHT = 0.03;
const MAX_HEIGHT = 0.8;

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

export const fitStampDimensions = ({ aspectRatio, pageRect, widthPercent = DEFAULT_WIDTH_PERCENT }) => {
    assertValidGeometry(pageRect, aspectRatio);
    const pageAspectRatio = pageRect.width / pageRect.height;
    const dimensionRatio = pageAspectRatio / aspectRatio;
    const maxWidth = Math.min(MAX_WIDTH, MAX_HEIGHT / dimensionRatio);
    const minWidth = Math.min(Math.max(MIN_WIDTH, MIN_HEIGHT / dimensionRatio), maxWidth);
    const safeWidth = clamp(widthPercent, minWidth, maxWidth);
    const safeHeight = safeWidth * dimensionRatio;
    return {
        widthPercent: roundCoordinate(safeWidth),
        heightPercent: roundCoordinate(safeHeight),
        requestedWidthPercent: widthPercent
    };
};

export const calculateStampPlacement = ({
    clientX,
    clientY,
    pageRect,
    aspectRatio,
    widthPercent = DEFAULT_WIDTH_PERCENT
}) => {
    const { widthPercent: safeWidth, heightPercent, requestedWidthPercent } = fitStampDimensions({
        aspectRatio,
        pageRect,
        widthPercent
    });
    const pointerX = (clientX - pageRect.left) / pageRect.width;
    const pointerY = (clientY - pageRect.top) / pageRect.height;

    return {
        xPercent: roundCoordinate(clamp(pointerX - safeWidth / 2, 0, 1 - safeWidth)),
        yPercent: roundCoordinate(clamp(pointerY - heightPercent / 2, 0, 1 - heightPercent)),
        widthPercent: safeWidth,
        heightPercent,
        requestedWidthPercent
    };
};

export const calculateInspectorStampSize = ({ stamp, requestedWidth }) => {
    if (!stamp || typeof stamp !== 'object') {
        throw new Error('A valid placed stamp is required');
    }
    const ratio = stamp.heightPercent / stamp.widthPercent;
    const maxWidth = Math.min(MAX_WIDTH, MAX_HEIGHT / ratio);
    const minWidth = Math.min(Math.max(MIN_WIDTH, MIN_HEIGHT / ratio), maxWidth);
    const fitWidth = clamp(requestedWidth, minWidth, maxWidth);
    const fitHeight = fitWidth * ratio;

    const xPercent = clamp(stamp.xPercent, 0, 1 - fitWidth);
    const yPercent = clamp(stamp.yPercent, 0, 1 - fitHeight);

    return {
        widthPercent: roundCoordinate(fitWidth),
        heightPercent: roundCoordinate(fitHeight),
        xPercent: roundCoordinate(xPercent),
        yPercent: roundCoordinate(yPercent),
        requestedWidthPercent: requestedWidth,
        isConstrained: Math.abs(fitWidth - requestedWidth) > 0.0001
    };
};

export const createPlacedStamp = ({ id, sourceStamp, placement, initialPreferences = {} }) => {
    const { requestedWidthPercent: _requestedWidth, ...cleanPlacement } = placement;
    return {
        id,
        stampId: sourceStamp.id,
        url: sourceStamp.url,
        ...cleanPlacement,
        rotation: initialPreferences.rotation ?? 0,
        ...REALISTIC_STAMP_PRESET,
        ...initialPreferences,
        ...cleanPlacement
    };
};
