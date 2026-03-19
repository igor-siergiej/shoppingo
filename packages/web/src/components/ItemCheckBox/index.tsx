import type { Item, ListType } from '@shoppingo/types';
import { Edit2, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useItemImage } from '../../hooks/useItemImage';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { DueDateBadge } from './DueDateBadge';
import { ItemEditDrawer } from './ItemEditDrawer';
import { ItemThumbnail } from './ItemThumbnail';
import { useItemEditState } from './useItemEditState';

export interface ItemCheckBoxProps {
    item: Item;
    listTitle: string;
    listType: ListType;
}

const ItemCheckBox = ({ item, listTitle, listType }: ItemCheckBoxProps) => {
    const { imageBlobUrl, hasLoadedImage, hasImageError, onImageLoad, onImageError } = useItemImage(item.name);
    const { x, controls, swipeState, handleDragEnd, closeSwipe } = useSwipeGesture();
    const {
        isEditDrawerOpen,
        setIsEditDrawerOpen,
        drawerEditValue,
        setDrawerEditValue,
        drawerQuantityValue,
        setDrawerQuantityValue,
        drawerUnitValue,
        setDrawerUnitValue,
        drawerDueDateValue,
        setDrawerDueDateValue,
        isDeleting,
        deleteMutation,
        toggleMutation,
        handleDeleteItem,
        handleEditStart,
        handleDrawerEditSave,
        handleDrawerEditCancel,
        handleToggleSelected,
    } = useItemEditState(item, listTitle);

    const handleToggleSelectedGuarded = async () => {
        if (toggleMutation.isLoading || swipeState !== 'closed') return;
        handleToggleSelected();
    };

    return (
        <motion.div
            layout
            className="relative mb-2 rounded-lg overflow-hidden"
            initial={{ opacity: 1, scale: 1, height: 'auto' }}
            animate={
                isDeleting
                    ? {
                          opacity: 0,
                          scale: 0.9,
                          height: 0,
                          marginBottom: 0,
                      }
                    : {
                          opacity: 1,
                          scale: item.isSelected ? 0.97 : 1,
                          height: 'auto',
                      }
            }
            transition={{
                duration: 0.35,
                ease: [0.4, 0, 0.2, 1],
                layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
            }}
        >
            {!isDeleting && (
                <div className="absolute inset-y-0 right-0 flex items-center justify-end w-32">
                    <Button
                        onClick={handleDeleteItem}
                        disabled={deleteMutation.isLoading}
                        className="h-[calc(100%-2px)] w-full rounded-lg bg-destructive hover:bg-destructive/90 text-white border border-destructive/20 shadow-sm flex items-center justify-end mr-1"
                    >
                        <div className="flex items-center justify-center pr-3.5">
                            {deleteMutation.isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Trash2 size={20} />
                            )}
                        </div>
                    </Button>
                </div>
            )}

            {!isDeleting && (
                <div className="absolute inset-y-0 left-0 flex items-center justify-start pl-1 w-32">
                    <Button
                        onClick={(e) => handleEditStart(e, closeSwipe)}
                        className="h-[calc(100%-2px)] w-full rounded-lg bg-blue-500 hover:bg-blue-600 text-white border border-blue-600/20 shadow-sm flex items-center"
                    >
                        <div className="flex items-center justify-center pr-10">
                            <Edit2 size={20} />
                        </div>
                    </Button>
                </div>
            )}

            {/* Draggable card */}
            <motion.div
                drag={!deleteMutation.isLoading ? 'x' : false}
                dragConstraints={{ left: -80, right: 80 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x }}
                className="relative z-10 bg-background rounded-lg"
                onClick={(e) => {
                    // Don't close if clicking on a button (let button handle its own click)
                    const target = e.target as HTMLElement;
                    if (target.closest('button')) {
                        return;
                    }

                    // Tap card when open to close it
                    if (swipeState !== 'closed') {
                        closeSwipe();
                    }
                }}
            >
                <motion.div
                    animate={{
                        opacity: toggleMutation.isLoading ? 0.5 : 1,
                    }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                    <Card
                        key={item.name}
                        className={`transition-all rounded-lg duration-200 py-0.5 px-1 ${
                            item.isSelected
                                ? 'bg-primary/10 border-primary/20 shadow-md'
                                : 'bg-background hover:bg-accent/50 border-border'
                        } ${swipeState === 'closed' ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${isDeleting || toggleMutation.isLoading ? 'pointer-events-none' : ''}`}
                        onClick={() => void handleToggleSelectedGuarded()}
                        onClickCapture={(e) => {
                            const target = e.target as HTMLElement;

                            if (target.closest('button')) {
                                return;
                            }
                        }}
                        role="button"
                        aria-pressed={item.isSelected}
                        aria-busy={toggleMutation.isLoading}
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                void handleToggleSelectedGuarded();
                            }
                            if (e.key === 'Escape' && swipeState !== 'closed') {
                                e.preventDefault();
                                closeSwipe();
                            }
                        }}
                    >
                        <CardContent className="flex items-center justify-between p-0.5">
                            <div className="flex items-center gap-4 flex-1">
                                <ItemThumbnail
                                    item={item}
                                    listType={listType}
                                    imageBlobUrl={imageBlobUrl}
                                    hasLoadedImage={hasLoadedImage}
                                    hasImageError={hasImageError}
                                    onImageLoad={onImageLoad}
                                    onImageError={onImageError}
                                    isToggling={toggleMutation.isLoading}
                                />

                                <Label
                                    className={`flex-1 cursor-pointer text-base transition-all duration-300 ${
                                        item.isSelected ? 'text-muted-foreground' : 'text-foreground'
                                    }`}
                                >
                                    <span className="relative inline-block">
                                        {item.name}
                                        {item.isSelected && (
                                            <motion.div
                                                className="absolute left-0 right-0 top-1/2 h-[2px] bg-muted-foreground/60"
                                                initial={{ scaleX: 0, originX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                            />
                                        )}
                                    </span>
                                </Label>
                            </div>

                            {/* Quantity badge for shopping lists */}
                            {listType === ListTypeEnum.SHOPPING && item.quantity !== undefined && item.unit && (
                                <div className="flex items-center justify-center px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 ml-2 shrink-0">
                                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                                        {item.quantity} {item.unit}
                                    </span>
                                </div>
                            )}

                            {listType === 'TODO' && <DueDateBadge dueDate={item.dueDate} />}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            <ItemEditDrawer
                open={isEditDrawerOpen}
                onOpenChange={setIsEditDrawerOpen}
                listType={listType}
                drawerEditValue={drawerEditValue}
                onEditValueChange={setDrawerEditValue}
                drawerQuantityValue={drawerQuantityValue}
                onQuantityChange={setDrawerQuantityValue}
                drawerUnitValue={drawerUnitValue}
                onUnitChange={setDrawerUnitValue}
                drawerDueDateValue={drawerDueDateValue}
                onDueDateChange={setDrawerDueDateValue}
                onSave={() => handleDrawerEditSave(listType)}
                onCancel={handleDrawerEditCancel}
            />
        </motion.div>
    );
};

export default ItemCheckBox;
