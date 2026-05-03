import { Loader2, RefreshCw } from 'lucide-react';
import { type MotionValue, motion, useTransform } from 'motion/react';

interface PullToRefreshIndicatorProps {
    pullY: MotionValue<number>;
    isRefreshing: boolean;
    hasTriggered: boolean;
}

const MAX_PULL = 120;
const THRESHOLD = 80;

export const PullToRefreshIndicator = ({ pullY, isRefreshing, hasTriggered }: PullToRefreshIndicatorProps) => {
    const opacity = useTransform(pullY, [0, 40], [0, 1]);
    const scale = useTransform(pullY, [0, MAX_PULL], [0.3, 1.0]);
    const height = useTransform(pullY, [0, MAX_PULL], ['0px', '52px']);
    const iconRotate = useTransform(pullY, [0, THRESHOLD * 1.5], [0, 180]);

    return (
        <motion.div style={{ height, opacity }} className="flex items-end justify-center overflow-hidden pb-1">
            <motion.div
                style={{ scale }}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-background border border-border shadow-sm"
            >
                {isRefreshing ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                    <motion.div style={{ rotate: iconRotate }}>
                        <RefreshCw
                            className={`h-6 w-6 transition-colors ${hasTriggered ? 'text-primary' : 'text-muted-foreground'}`}
                        />
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
};
