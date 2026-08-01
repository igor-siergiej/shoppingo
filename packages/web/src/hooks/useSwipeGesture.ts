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

const OPEN_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 500;
const CLOSE_THRESHOLD = 30;
const SNAP_BACK_THRESHOLD = 20;
const SWIPE_REVEAL_DISTANCE = 80;

type SwipeState = 'closed' | 'left' | 'right';

const isClosingBackPast = (swipeState: SwipeState, offset: number): boolean => {
    if (swipeState === 'left') return offset > CLOSE_THRESHOLD;
    if (swipeState === 'right') return offset < -CLOSE_THRESHOLD;
    return false;
};

const isSnappingBackToCenter = (swipeState: SwipeState, offset: number): boolean =>
    swipeState !== 'closed' && Math.abs(offset) < SNAP_BACK_THRESHOLD;

const shouldCloseSwipe = (swipeState: SwipeState, offset: number): boolean =>
    isClosingBackPast(swipeState, offset) || isSnappingBackToCenter(swipeState, offset);

const exceedsOpenThreshold = (offset: number, velocity: number, direction: 1 | -1): boolean =>
    direction * offset > OPEN_THRESHOLD || direction * velocity > VELOCITY_THRESHOLD;

// fallow-ignore-next-line complexity
const resolveSwipeDirection = (swipeState: SwipeState, offset: number, velocity: number): SwipeState | null => {
    if (swipeState !== 'left' && exceedsOpenThreshold(offset, velocity, -1)) return 'left';
    if (swipeState !== 'right' && exceedsOpenThreshold(offset, velocity, 1)) return 'right';
    return null;
};

const targetXFor = (state: SwipeState): number => {
    if (state === 'left') return -SWIPE_REVEAL_DISTANCE;
    if (state === 'right') return SWIPE_REVEAL_DISTANCE;
    return 0;
};

const resolveSwipeTarget = (
    swipeState: SwipeState,
    offset: number,
    velocity: number
): { newState: SwipeState; targetX: number } => {
    if (shouldCloseSwipe(swipeState, offset)) {
        return { newState: 'closed', targetX: 0 };
    }

    const direction = resolveSwipeDirection(swipeState, offset, velocity);
    const newState = direction ?? swipeState;
    return { newState, targetX: targetXFor(newState) };
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
