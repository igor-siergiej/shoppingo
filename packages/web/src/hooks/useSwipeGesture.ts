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

// Matches Calendar/SwipeableRow's snap-back spring — stiffer/faster settle than the
// old 300/30 shrinks the window where a card is still mid-animation over a revealed
// button when the next tap lands (see SWIPE_DELETE_COMMIT_DISTANCE below for the
// primary fix, this is defence in depth for the partial-swipe-then-tap fallback).
const SPRING = { type: 'spring', stiffness: 400, damping: 40 } as const;

// Must match the revealed action button's width (w-20 = 80px) so the swiped-open
// card fully clears the button. A shorter reveal leaves part of the button behind
// the still-overlapping card, so a tap there hits the card (closing the swipe)
// instead of the button underneath — requiring a second tap to actually press it.
export const SWIPE_REVEAL_DISTANCE = 80;

// Swipe left past this distance (or fast enough) and release: commit the delete
// immediately, the same way Calendar/SwipeableRow deletes on a single drag gesture
// with no separate button tap. Reported as "delete needs 2 presses" on Android
// Chrome — a reveal-then-tap flow races the button's hit-test against the card's
// still-animating spring-back position; a tap that lands before settle hits the
// card (which closes the swipe) instead of the button. Committing on the drag
// gesture itself removes that race for a full swipe; a partial swipe still falls
// back to reveal + tap.
const SWIPE_DELETE_COMMIT_DISTANCE = 140;
const SWIPE_DELETE_COMMIT_VELOCITY = 900;

// Card's dragConstraints need enough left travel to reach the commit distance —
// SWIPE_REVEAL_DISTANCE alone would clamp the drag before commit is reachable.
export const SWIPE_DELETE_DRAG_CONSTRAINT = 160;

const isCommitDeleteSwipe = (offset: number, velocity: number): boolean =>
    offset < -SWIPE_DELETE_COMMIT_DISTANCE ||
    (offset < -SWIPE_REVEAL_DISTANCE && velocity < -SWIPE_DELETE_COMMIT_VELOCITY);

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
        return { newState: 'left', targetX: -SWIPE_REVEAL_DISTANCE };
    }

    if (shouldSwipeRight && swipeState !== 'right') {
        return { newState: 'right', targetX: SWIPE_REVEAL_DISTANCE };
    }

    if (swipeState !== 'closed' && Math.abs(offset) < 20) {
        return { newState: 'closed', targetX: 0 };
    }

    if (swipeState === 'closed') {
        return { newState: 'closed', targetX: 0 };
    }

    return { newState: swipeState, targetX: swipeState === 'left' ? -SWIPE_REVEAL_DISTANCE : SWIPE_REVEAL_DISTANCE };
};

export function useSwipeGesture(onCommitDelete?: () => void): UseSwipeGestureReturn {
    const x = useMotionValue(0);
    const controls = useAnimation();
    const [swipeState, setSwipeState] = useState<'closed' | 'left' | 'right'>('closed');

    const handleDragEnd = (_event: unknown, info: PanInfo) => {
        if (onCommitDelete && isCommitDeleteSwipe(info.offset.x, info.velocity.x)) {
            setSwipeState('closed');
            void controls.start({ x: 0, transition: SPRING });
            onCommitDelete();
            return;
        }

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
