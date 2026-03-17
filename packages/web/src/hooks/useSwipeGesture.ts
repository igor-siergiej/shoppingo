import { AnimationControls, MotionValue, useAnimation, useMotionValue } from 'motion/react';
import { useState } from 'react';

export interface PanInfo {
    offset: { x: number };
    velocity: { x: number };
}

export interface UseSwipeGestureReturn {
    x: MotionValue<number>;
    controls: AnimationControls;
    swipeState: 'closed' | 'left' | 'right';
    handleDragEnd: (event: unknown, info: PanInfo) => void;
    closeSwipe: () => void;
}

export function useSwipeGesture(): UseSwipeGestureReturn {
    const x = useMotionValue(0);
    const controls = useAnimation();
    const [swipeState, setSwipeState] = useState<'closed' | 'left' | 'right'>('closed');

    const handleDragEnd = (_event: unknown, info: PanInfo) => {
        const threshold = 60;
        const swipeVelocityThreshold = 500;
        const closeThreshold = 30;

        const shouldSwipeLeft = info.offset.x < -threshold || info.velocity.x < -swipeVelocityThreshold;
        const shouldSwipeRight = info.offset.x > threshold || info.velocity.x > swipeVelocityThreshold;

        if (swipeState === 'left' && info.offset.x > closeThreshold) {
            setSwipeState('closed');
            void controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        } else if (swipeState === 'right' && info.offset.x < -closeThreshold) {
            setSwipeState('closed');
            void controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        } else if (shouldSwipeLeft && swipeState !== 'left') {
            setSwipeState('left');
            void controls.start({ x: -80, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        } else if (shouldSwipeRight && swipeState !== 'right') {
            setSwipeState('right');
            void controls.start({ x: 80, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        } else if (swipeState !== 'closed' && Math.abs(info.offset.x) < 20) {
            setSwipeState('closed');
            void controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        } else if (swipeState === 'closed') {
            void controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        } else {
            const targetX = swipeState === 'left' ? -80 : 80;
            void controls.start({ x: targetX, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        }
    };

    const closeSwipe = () => {
        if (swipeState !== 'closed') {
            setSwipeState('closed');
            void controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        }
    };

    return {
        x,
        controls,
        swipeState,
        handleDragEnd,
        closeSwipe,
    };
}
