import type { DayDot } from './index';

export interface DayDotsProps {
    dots: DayDot[];
    dayKeyPrefix: string;
    selected: boolean;
}

export const DayDots = ({ dots, dayKeyPrefix, selected }: DayDotsProps) => {
    if (dots.length === 0) return null;

    return (
        <span className="flex gap-0.5 mt-0.5">
            {dots.slice(0, 3).map((dot, i) => (
                <span
                    key={`${dayKeyPrefix}-dot-${i}-${dot.color}`}
                    data-testid="day-dot"
                    data-dimmed={dot.dimmed}
                    className={`h-1.5 w-1.5 rounded-full ${dot.dimmed ? 'opacity-30' : ''}`}
                    style={{ backgroundColor: selected ? '#fff' : dot.color }}
                />
            ))}
        </span>
    );
};
