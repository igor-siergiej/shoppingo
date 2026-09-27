import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSwipeGesture } from './useSwipeGesture';

describe('useSwipeGesture', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with closed swipe state', () => {
        const { result } = renderHook(() => useSwipeGesture());

        expect(result.current.swipeState).toBe('closed');
    });

    it('provides motion values and controls', () => {
        const { result } = renderHook(() => useSwipeGesture());

        expect(result.current.x).toBeDefined();
        expect(result.current.controls).toBeDefined();
    });

    it('provides handleDragEnd callback', () => {
        const { result } = renderHook(() => useSwipeGesture());

        expect(typeof result.current.handleDragEnd).toBe('function');
    });

    it('provides closeSwipe callback', () => {
        const { result } = renderHook(() => useSwipeGesture());

        expect(typeof result.current.closeSwipe).toBe('function');
    });

    it('swipes left when offset exceeds threshold', () => {
        const { result } = renderHook(() => useSwipeGesture());

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: -100 },
                velocity: { x: 0 },
            });
        });

        expect(result.current.swipeState).toBe('left');
    });

    it('swipes right when offset exceeds threshold', () => {
        const { result } = renderHook(() => useSwipeGesture());

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: 100 },
                velocity: { x: 0 },
            });
        });

        expect(result.current.swipeState).toBe('right');
    });

    it('considers velocity for swipe detection', () => {
        const { result } = renderHook(() => useSwipeGesture());

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: -40 },
                velocity: { x: -600 },
            });
        });

        expect(result.current.swipeState).toBe('left');
    });

    it('closes swipe when offset is small while open', () => {
        const { result } = renderHook(() => useSwipeGesture());

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: -100 },
                velocity: { x: 0 },
            });
        });

        expect(result.current.swipeState).toBe('left');

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: 15 },
                velocity: { x: 0 },
            });
        });

        expect(result.current.swipeState).toBe('closed');
    });

    it('closeSwipe explicitly closes any open swipe', () => {
        const { result } = renderHook(() => useSwipeGesture());

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: -100 },
                velocity: { x: 0 },
            });
        });

        expect(result.current.swipeState).toBe('left');

        act(() => {
            result.current.closeSwipe();
        });

        expect(result.current.swipeState).toBe('closed');
    });

    it('ignores closeSwipe when already closed', () => {
        const { result } = renderHook(() => useSwipeGesture());

        expect(result.current.swipeState).toBe('closed');

        act(() => {
            result.current.closeSwipe();
        });

        expect(result.current.swipeState).toBe('closed');
    });

    it('springs back to center when swipe is too small', () => {
        const { result } = renderHook(() => useSwipeGesture());

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: -30 },
                velocity: { x: 0 },
            });
        });

        expect(result.current.swipeState).toBe('closed');
    });

    it('commits delete on a swipe past the commit distance, without needing a follow-up tap', () => {
        const onCommitDelete = vi.fn();
        const { result } = renderHook(() => useSwipeGesture(onCommitDelete));

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: -150 },
                velocity: { x: 0 },
            });
        });

        expect(onCommitDelete).toHaveBeenCalledTimes(1);
        expect(result.current.swipeState).toBe('closed');
    });

    it('commits delete on a fast flick past the reveal distance, even under the commit distance', () => {
        const onCommitDelete = vi.fn();
        const { result } = renderHook(() => useSwipeGesture(onCommitDelete));

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: -90 },
                velocity: { x: -1000 },
            });
        });

        expect(onCommitDelete).toHaveBeenCalledTimes(1);
    });

    it('does not commit delete for a normal reveal swipe (falls back to reveal + tap)', () => {
        const onCommitDelete = vi.fn();
        const { result } = renderHook(() => useSwipeGesture(onCommitDelete));

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: -100 },
                velocity: { x: 0 },
            });
        });

        expect(onCommitDelete).not.toHaveBeenCalled();
        expect(result.current.swipeState).toBe('left');
    });

    it('never commits delete when no onCommitDelete callback is provided', () => {
        const { result } = renderHook(() => useSwipeGesture());

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: -200 },
                velocity: { x: 0 },
            });
        });

        expect(result.current.swipeState).toBe('left');
    });

    it('maintains open state when drag is minimal while open', () => {
        const { result } = renderHook(() => useSwipeGesture());

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: -100 },
                velocity: { x: 0 },
            });
        });

        expect(result.current.swipeState).toBe('left');

        act(() => {
            result.current.handleDragEnd(new PointerEvent('dragend'), {
                offset: { x: -5 },
                velocity: { x: 0 },
            });
        });

        expect(result.current.swipeState).toBe('closed');
    });
});
