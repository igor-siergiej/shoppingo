import type { AnimationControls, MotionValue } from 'motion/react';
import { motion } from 'motion/react';
import type { MouseEvent, ReactNode } from 'react';
import { SwipeActionButtons } from '../SwipeActionButtons';

const SWIPE_REVEAL_DISTANCE = 80;

interface SwipeableRowProps {
    isDeleting: boolean;
    isDeleteLoading: boolean;
    isDragDisabled: boolean;
    swipeState: 'closed' | 'left' | 'right';
    x: MotionValue<number>;
    controls: AnimationControls;
    scale?: number;
    onDragEnd: (event: unknown, info: { offset: { x: number }; velocity: { x: number } }) => void;
    closeSwipe: () => void;
    onDelete: (e?: MouseEvent) => void;
    onEdit: (e?: MouseEvent) => void;
    children: ReactNode;
}

export const SwipeableRow = ({
    isDeleting,
    isDeleteLoading,
    isDragDisabled,
    swipeState,
    x,
    controls,
    scale = 1,
    onDragEnd,
    closeSwipe,
    onDelete,
    onEdit,
    children,
}: SwipeableRowProps) => (
    <motion.div
        layout
        className="relative mb-2 rounded-lg overflow-hidden"
        initial={{ opacity: 1, scale: 1, height: 'auto' }}
        animate={
            isDeleting ? { opacity: 0, scale: 0.9, height: 0, marginBottom: 0 } : { opacity: 1, scale, height: 'auto' }
        }
        transition={{
            duration: 0.35,
            ease: [0.4, 0, 0.2, 1],
            layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
        }}
    >
        <SwipeActionButtons
            isDeleting={isDeleting}
            isDeleteLoading={isDeleteLoading}
            onDelete={onDelete}
            onEdit={onEdit}
        />

        <motion.div
            drag={!isDragDisabled ? 'x' : false}
            dragConstraints={{ left: -SWIPE_REVEAL_DISTANCE, right: SWIPE_REVEAL_DISTANCE }}
            dragElastic={0.1}
            onDragEnd={onDragEnd}
            animate={controls}
            style={{ x }}
            className="relative z-10 bg-background rounded-lg"
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button')) return;
                if (swipeState !== 'closed') closeSwipe();
            }}
        >
            {children}
        </motion.div>
    </motion.div>
);
