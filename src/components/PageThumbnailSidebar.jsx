import React from 'react';
import { useApp } from '../context/useApp';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import PageThumbnailCard from './PageThumbnailCard';
import SidebarFileAdder from './SidebarFileAdder';

const DRAG_ACTIVATION_DISTANCE = 5;
const PageThumbnailSidebar = () => {
    const { documents, reorderDocuments } = useApp();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );
    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        reorderDocuments(arrayMove(documents, documents.findIndex(doc => doc.id === active.id), documents.findIndex(doc => doc.id === over.id)));
    };
    if (!documents.length) return null;
    return (
        <div className="page-sidebar flex flex-col h-full bg-gray-50 border-r border-gray-200 flex-shrink-0"
            style={{ width: 224, maxWidth: 224, minWidth: 224 }}>
            <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                <h3 className="font-bold text-gray-700 text-sm">页面预览 ({documents.length})</h3>
                <p className="text-xs text-gray-400 mt-1">点击切页 · 拖动排序</p>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={documents.map(doc => doc.id)} strategy={verticalListSortingStrategy}>
                        {documents.map((doc, index) => <PageThumbnailCard key={doc.id} doc={doc} index={index} actions={{
                            up: () => reorderDocuments(arrayMove(documents, index, index - 1)),
                            down: () => reorderDocuments(arrayMove(documents, index, index + 1)),
                            isLast: index === documents.length - 1
                        }} />)}
                    </SortableContext>
                </DndContext>
            </div>
            <SidebarFileAdder />
        </div>
    );
};
export default PageThumbnailSidebar;
