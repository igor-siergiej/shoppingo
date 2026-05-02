import { animate, useMotionValue } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const RESISTANCE = 0.4;
const THRESHOLD = 80;
const MAX_PULL = 120;

const SPRING_BACK = { type: 'spring', stiffness: 300, damping: 30 } as const;
const SPRING_HOLD = { type: 'spring', stiffness: 200, damping: 25 } as const;

export interface UsePullToRefreshReturn {
    scrollRef: React.RefObject<HTMLDivElement | null>;
    pullY: ReturnType<typeof useMotionValue<number>>;
    isRefreshing: boolean;
    hasTriggered: boolean;
}

export function usePullToRefresh(onRefresh: () => Promise<void>): UsePullToRefreshReturn {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasTriggered, setHasTriggered] = useState(false);

    const pullY = useMotionValue(0);

    const isPulling = useRef(false);
    const touchStartY = useRef(0);
    const hasFiredHaptic = useRef(false);
    const isRefreshingRef = useRef(false);
    const currentAnim = useRef<ReturnType<typeof animate> | null>(null);

    const springTo = useCallback(
        (target: number, config: typeof SPRING_BACK | typeof SPRING_HOLD) => {
            currentAnim.current?.stop();
            currentAnim.current = animate(pullY, target, config);
        },
        [pullY]
    );

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onTouchStart = (e: TouchEvent) => {
            if (isRefreshingRef.current) return;
            if (el.scrollTop > 0) return;
            touchStartY.current = e.touches[0].clientY;
            isPulling.current = true;
            hasFiredHaptic.current = false;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!isPulling.current) return;
            if (el.scrollTop > 0) {
                isPulling.current = false;
                return;
            }

            const rawDelta = e.touches[0].clientY - touchStartY.current;
            if (rawDelta <= 0) {
                isPulling.current = false;
                pullY.set(0);
                return;
            }

            e.preventDefault();

            const resisted = Math.min(rawDelta * RESISTANCE, MAX_PULL);
            pullY.set(resisted);

            if (resisted >= THRESHOLD && !hasFiredHaptic.current) {
                hasFiredHaptic.current = true;
                navigator.vibrate?.(10);
                setHasTriggered(true);
            } else if (resisted < THRESHOLD && hasFiredHaptic.current) {
                hasFiredHaptic.current = false;
                setHasTriggered(false);
            }
        };

        const onTouchEnd = async () => {
            if (!isPulling.current) return;
            isPulling.current = false;

            const current = pullY.get();
            if (current >= THRESHOLD) {
                springTo(THRESHOLD, SPRING_HOLD);
                isRefreshingRef.current = true;
                setIsRefreshing(true);
                try {
                    await onRefresh();
                } finally {
                    isRefreshingRef.current = false;
                    setIsRefreshing(false);
                    setHasTriggered(false);
                    springTo(0, SPRING_BACK);
                }
            } else {
                setHasTriggered(false);
                springTo(0, SPRING_BACK);
            }
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            currentAnim.current?.stop();
        };
    }, [onRefresh, pullY, springTo]);

    return { scrollRef, pullY, isRefreshing, hasTriggered };
}
