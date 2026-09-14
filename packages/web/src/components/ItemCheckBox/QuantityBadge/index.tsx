interface QuantityBadgeProps {
    quantity: number | undefined;
    unit: string | undefined;
}

export const QuantityBadge = ({ quantity, unit }: QuantityBadgeProps) => {
    if (quantity === undefined && !unit) return null;

    const label = [quantity, unit].filter((part) => part !== undefined && part !== '').join(' ');

    return (
        <div className="flex items-center justify-center px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 ml-2 shrink-0">
            <span className="text-sm font-semibold text-primary whitespace-nowrap">{label}</span>
        </div>
    );
};
