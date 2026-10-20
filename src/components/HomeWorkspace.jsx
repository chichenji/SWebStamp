import React from 'react';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import DocumentPreview from './DocumentPreview';
import FileUpload from './FileUpload';
import PageThumbnailSidebar from './PageThumbnailSidebar';
import StampManager from './StampManager';

const HomeWorkspace = ({ documents, sensors, draggedStamp, actions }) => (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={actions.onDragStart}
        onDragCancel={actions.onDragCancel} onDragEnd={actions.onDragEnd}>
        <div className="workspace-shell">
            {documents.length > 0 && <PageThumbnailSidebar />}
            <main className="workspace-main">
                {documents.length === 0 ? <div className="empty-workspace"><FileUpload /></div> : <DocumentPreview />}
            </main>
            <aside className="workspace-inspector">
                <StampManager onOpenCrossPageTool={actions.onOpenCrossPageTool} onOpenWatermarkTool={actions.onOpenWatermarkTool} />
            </aside>
        </div>
        <DragOverlay dropAnimation={null}>
            {draggedStamp && <div className="stamp-drag-overlay"><img src={draggedStamp.url} alt="" /></div>}
        </DragOverlay>
    </DndContext>
);
export default HomeWorkspace;
