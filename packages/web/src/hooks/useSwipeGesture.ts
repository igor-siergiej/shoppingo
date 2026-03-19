import { type AnimationControls, type MotionValue, useAnimation, useMotionValue } from 'motion/react';
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

const SPRING = { type: 'spring', stiffness: 300, damping: 30 } as const;

const resolveSwipeTarget = (
    swipeState: 'closed' | 'left' | 'right',
    offset: number,
    velocity: number
): { newState: 'closed' | 'left' | 'right'; targetX: number } => {
    const threshold = 60;
    const swipeVelocityThreshold = 500;
    const closeThreshold = 30;

    const shouldSwipeLeft = offset < -threshold || velocity < -swipeVelocityThreshold;
    const shouldSwipeRight = offset > threshold || velocity > swipeVelocityThreshold;

    if (swipeState === 'left' && offset > closeThreshold) {
        return { newState: 'closed', targetX: 0 };
    }

    if (swipeState === 'right' && offset < -closeThreshold) {
        return { newState: 'closed', targetX: 0 };
    }

    if (shouldSwipeLeft && swipeState !== 'left') {
        return { newState: 'left', targetX: -80 };
    }

    if (shouldSwipeRight && swipeState !== 'right') {
        return { newState: 'right', targetX: 80 };
    }

    if (swipeState !== 'closed' && Math.abs(offset) < 20) {
        return { newState: 'closed', targetX: 0 };
    }

    if (swipeState === 'closed') {
        return { newState: 'closed', targetX: 0 };
    }

    return { newState: swipeState, targetX: swipeState === 'left' ? -80 : 80 };
};

export function useSwipeGesture(): UseSwipeGestureReturn {
    const x = useMotionValue(0);
    const controls = useAnimation();
    const [swipeState, setSwipeState] = useState<'closed' | 'left' | 'right'>('closed');

    const handleDragEnd = (_event: unknown, info: PanInfo) => {
        const { newState, targetX } = resolveSwipeTarget(swipeState, info.offset.x, info.velocity.x);
        setSwipeState(newState);
        void controls.start({ x: targetX, transition: SPRING });
    };

    const closeSwipe = () => {
        if (swipeState !== 'closed') {
            setSwipeState('closed');
            void controls.start({ x: 0, transition: SPRING });
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
