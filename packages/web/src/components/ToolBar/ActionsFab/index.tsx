import { Ellipsis } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { ToolBarButton } from '../ToolBarButton';

export interface ActionItem {
    show: boolean;
    label: string;
    icon: ComponentType<{ className?: string }>;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'destructive';
}

interface ActionsFabProps {
    actionItems: ActionItem[];
}

const circleClasses = (variant: ActionItem['variant'], disabled: boolean | undefined) => {
    if (disabled) return 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed';
    if (variant === 'destructive') return 'bg-destructive text-white';
    return 'bg-secondary text-secondary-foreground';
};

export const ActionsFab = ({ actionItems }: ActionsFabProps) => {
    const [open, setOpen] = useState(false);
    const visibleItems = actionItems.filter((item) => item.show);

    if (visibleItems.length === 0) return null;

    const handleItemClick = (item: ActionItem) => {
        if (item.disabled) return;
        item.onClick();
        setOpen(false);
    };

    return (
        <div className="relative">
            <AnimatePresence>
                {open && (
                    <div className="absolute bottom-full left-1/2 mb-3 flex -translate-x-1/2 flex-col items-center gap-3">
                        {visibleItems.map((item, i) => {
                            const Icon = item.icon;
                            const delayIndex = visibleItems.length - 1 - i;
                            return (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, y: 12, scale: 0.6 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 12, scale: 0.6 }}
                                    transition={{
                                        delay: delayIndex * 0.04,
                                        type: 'spring',
                                        bounce: 0.3,
                                        duration: 0.3,
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <span className="bg-foreground text-background text-xs font-medium px-2.5 py-1 rounded-md shadow-md whitespace-nowrap">
                                        {item.label}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleItemClick(item)}
                                        disabled={item.disabled}
                                        title={item.label}
                                        className={`size-11 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform ${circleClasses(item.variant, item.disabled)}`}
                                    >
                                        <Icon className="size-5" />
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </AnimatePresence>

            <ToolBarButton icon={Ellipsis} title="Actions" onClick={() => setOpen((o) => !o)} active={open} />
        </div>
    );
};
