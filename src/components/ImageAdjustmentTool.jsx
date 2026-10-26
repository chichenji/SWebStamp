import React from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/useApp';
import { IMAGE_ADJUSTMENT_FIELDS } from '../utils/imageAdjustment.js';
import FloatingToolWindow from './FloatingToolWindow';
import './scanEffect.css';

const AdjustmentSlider = ({ field, value, onChange, disabled }) => (
    <label className="scan-slider">
        <span>{field.label}<output>{disabled ? '-' : `${value}${field.unit}`}</output></span>
        <input
            aria-label={field.label}
            type="range"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={value}
            disabled={disabled}
            onChange={event => onChange({ [field.key]: Number(event.target.value) })}
        />
    </label>
);

const ToolIntro = () => (
    <div className="scan-intro">
        <SlidersHorizontal size={23} />
        <div>
            <strong>文档页面图片调整</strong>
            <p>非破坏性调整 · 保留原始文件 · 仅作用于底图</p>
        </div>
    </div>
);

const AdjustmentScopeSection = ({ scope, onChangeScope, hasDocuments, hasSelectedPage, pageNumber }) => {
    const pageLabel = hasSelectedPage ? `仅当前第 ${pageNumber} 页` : '未选择页面';
    const hint = !hasDocuments
        ? '当前暂无导入的文档页面。'
        : scope === 'all'
            ? '全部页面设置仅应用于当前已导入的页面。'
            : hasSelectedPage
                ? '设置跟随此页，不受页面重排影响。'
                : '请在页面列表中选择需要调整的页面。';

    return (
        <>
            <label className="scan-scope">
                调整范围
                <select
                    aria-label="图片调整范围"
                    value={scope}
                    disabled={!hasDocuments}
                    onChange={event => onChangeScope(event.target.value)}
                >
                    <option value="page" disabled={!hasSelectedPage}>
                        {pageLabel}
                    </option>
                    <option value="all" disabled={!hasDocuments}>
                        全部页面（仅当前已导入页面）
                    </option>
                </select>
            </label>
            <p className="scan-hint">{hint}</p>
        </>
    );
};

const AdjustmentSliderSection = ({ activeImageAdjustments, isOperationDisabled, onUpdate }) => (
    <section className="scan-section">
        <h3>色彩与明暗</h3>
        {IMAGE_ADJUSTMENT_FIELDS.map(field => (
            <AdjustmentSlider
                key={field.key}
                field={field}
                value={activeImageAdjustments[field.key]}
                disabled={isOperationDisabled}
                onChange={onUpdate}
            />
        ))}
    </section>
);

const CompareOriginalControl = ({ compareOriginal, onToggleCompare, disabled }) => (
    <>
        <label className="scan-check">
            <input
                type="checkbox"
                checked={compareOriginal}
                disabled={disabled}
                onChange={event => onToggleCompare(event.target.checked)}
            />
            对比原图（仅预览，导出仍应用调整）
        </label>
        {compareOriginal && !disabled && (
            <div className="text-xs bg-amber-50 text-amber-800 p-2 rounded border border-amber-200 flex items-center justify-between mt-2">
                <span>正在对比原图（效果暂隐）</span>
                <button
                    type="button"
                    className="text-amber-900 underline font-medium ml-2 cursor-pointer"
                    onClick={() => onToggleCompare(false)}
                >
                    退出对比
                </button>
            </div>
        )}
    </>
);

const ToolFooter = ({ isOperationDisabled, onReset, onClose }) => (
    <>
        <button
            type="button"
            className="tool-secondary"
            disabled={isOperationDisabled}
            onClick={onReset}
        >
            <RotateCcw size={13} /> 恢复默认
        </button>
        <button type="button" className="tool-primary" onClick={onClose}>
            完成
        </button>
    </>
);

const ImageAdjustmentTool = ({ isOpen, onClose }) => {
    const {
        documents,
        activeDocumentId,
        imageAdjustmentScope,
        setImageAdjustmentScope,
        activeImageAdjustments,
        updateImageAdjustments,
        resetImageAdjustments,
        compareOriginal,
        setCompareOriginal
    } = useApp();

    if (!isOpen) return null;

    const pageIndex = activeDocumentId ? documents.findIndex(doc => doc.id === activeDocumentId) : -1;
    const hasSelectedPage = pageIndex >= 0;
    const hasDocuments = documents.length > 0;
    const isOperationDisabled = !hasDocuments || (imageAdjustmentScope === 'page' && !hasSelectedPage);

    const handleClose = () => {
        if (compareOriginal) setCompareOriginal(false);
        onClose();
    };

    return (
        <FloatingToolWindow
            title="页面图片调整"
            onClose={handleClose}
            width={350}
            footer={<ToolFooter isOperationDisabled={isOperationDisabled} onReset={() => resetImageAdjustments(imageAdjustmentScope)} onClose={handleClose} />}
        >
            <ToolIntro />
            <AdjustmentScopeSection
                scope={imageAdjustmentScope}
                onChangeScope={setImageAdjustmentScope}
                hasDocuments={hasDocuments}
                hasSelectedPage={hasSelectedPage}
                pageNumber={pageIndex + 1}
            />
            <AdjustmentSliderSection
                activeImageAdjustments={activeImageAdjustments}
                isOperationDisabled={isOperationDisabled}
                onUpdate={updateImageAdjustments}
            />
            <CompareOriginalControl
                compareOriginal={compareOriginal}
                disabled={!hasDocuments}
                onToggleCompare={setCompareOriginal}
            />
        </FloatingToolWindow>
    );
};

export default ImageAdjustmentTool;
