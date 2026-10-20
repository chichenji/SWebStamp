const A4_PORTRAIT_RATIO = 210 / 297;
const A4_LANDSCAPE_RATIO = 297 / 210;
const DEG_TO_RAD = Math.PI / 180;

export const getRotatedBoundingBox = ({ width, height, angleDegrees }) => {
    const radians = Math.abs(angleDegrees * DEG_TO_RAD);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
        width: width * cos + height * sin,
        height: width * sin + height * cos
    };
};

const calculateTargetDimensions = (sourceWidth, sourceHeight, fitToA4) => {
    if (!fitToA4) {
        return { targetWidth: sourceWidth, targetHeight: sourceHeight };
    }
    const isLandscape = sourceWidth >= sourceHeight;
    const a4Ratio = isLandscape ? A4_LANDSCAPE_RATIO : A4_PORTRAIT_RATIO;
    const sourceRatio = sourceWidth / sourceHeight;

    if (sourceRatio > a4Ratio) {
        return {
            targetWidth: sourceWidth,
            targetHeight: Math.round(sourceWidth / a4Ratio)
        };
    }
    return {
        targetWidth: Math.round(sourceHeight * a4Ratio),
        targetHeight: sourceHeight
    };
};

export const calculateScanGeometry = ({
    sourceWidth,
    sourceHeight,
    fitToA4 = false,
    tiltAngle = 0
}) => {
    if (![sourceWidth, sourceHeight].every(value => Number.isFinite(value) && value > 0)) {
        throw new TypeError('扫描页面宽高必须是正数');
    }
    if (!Number.isFinite(tiltAngle)) throw new TypeError('扫描倾斜角度必须是有限数字');
    const { targetWidth, targetHeight } = calculateTargetDimensions(sourceWidth, sourceHeight, fitToA4);
    const rawBox = getRotatedBoundingBox({
        width: sourceWidth,
        height: sourceHeight,
        angleDegrees: tiltAngle
    });

    const scaleX = targetWidth / Math.max(targetWidth, rawBox.width);
    const scaleY = targetHeight / Math.max(targetHeight, rawBox.height);
    const scale = Math.min(scaleX, scaleY);

    return Object.freeze({
        sourceWidth,
        sourceHeight,
        targetWidth,
        targetHeight,
        contentWidth: sourceWidth * scale,
        contentHeight: sourceHeight * scale,
        scale,
        rotationDegrees: tiltAngle,
        centerX: targetWidth / 2,
        centerY: targetHeight / 2
    });
};

export const mapTargetToPointer = ({ sourceXPercent, sourceYPercent, geometry }) => {
    const rad = geometry.rotationDegrees * DEG_TO_RAD;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const localX = (sourceXPercent - 0.5) * geometry.contentWidth;
    const localY = (sourceYPercent - 0.5) * geometry.contentHeight;

    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;

    const targetX = geometry.centerX + rotatedX;
    const targetY = geometry.centerY + rotatedY;

    return {
        x: targetX,
        y: targetY,
        xPercent: targetX / geometry.targetWidth,
        yPercent: targetY / geometry.targetHeight
    };
};

export const mapPointerToSource = ({ targetX, targetY, geometry }) => {
    const rad = -geometry.rotationDegrees * DEG_TO_RAD;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const shiftedX = targetX - geometry.centerX;
    const shiftedY = targetY - geometry.centerY;

    const unrotatedX = shiftedX * cos - shiftedY * sin;
    const unrotatedY = shiftedX * sin + shiftedY * cos;

    const xPercent = (unrotatedX / geometry.contentWidth) + 0.5;
    const yPercent = (unrotatedY / geometry.contentHeight) + 0.5;

    return {
        xPercent: Math.max(0, Math.min(1, xPercent)),
        yPercent: Math.max(0, Math.min(1, yPercent))
    };
};

export const mapDeltaToSource = ({ deltaX, deltaY, geometry }) => {
    const rad = -geometry.rotationDegrees * DEG_TO_RAD;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const unrotatedDx = deltaX * cos - deltaY * sin;
    const unrotatedDy = deltaX * sin + deltaY * cos;

    return {
        deltaXPercent: unrotatedDx / geometry.contentWidth,
        deltaYPercent: unrotatedDy / geometry.contentHeight
    };
};
