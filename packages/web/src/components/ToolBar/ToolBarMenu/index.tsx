import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

interface ToolBarMenuProps {
    isOpen: boolean;
    contentHeight: number;
    children: React.ReactNode;
    maxWidth?: number;
}

const transition = {
    type: 'spring' as const,
    bounce: 0.1,
    duration: 0.25,
};

export const ToolBarMenu = ({ isOpen, contentHeight, children, maxWidth = 0 }: ToolBarMenuProps) => {
    return (
        <div className="shadow-xl py-0 gap-0 backdrop-blur-sm border border-slate-200/50 relative z-10 rounded-lg">
            <div className="overflow-hidden">
                <AnimatePresence initial={false} mode="sync">
                    {isOpen ? (
                        <motion.div
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: contentHeight || 0, opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                                height: { duration: 0.3 },
                                opacity: { duration: 0.2 },
                            }}
                            style={{ width: maxWidth }}
                        >
                            <div className="px-3 py-4">{children}</div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {isOpen && <div className="h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />}
        </div>
    );
};
