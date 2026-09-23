import { useState } from 'react';
import { useLastSeenVersion } from '../../hooks/useLastSeenVersion';
import { SyncStatusBadge } from '../SyncStatusBadge';
import { latestReleaseVersion, WhatsNewDrawer } from '../WhatsNewDrawer';

const Appbar = () => {
    const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
    // Captured when the panel opens, before markSeen clears it, so the panel
    // can still flag which releases were unread.
    const [highlightSince, setHighlightSince] = useState<string | null>(null);
    const { lastSeen, hasUnseenRelease, markSeen } = useLastSeenVersion(latestReleaseVersion);

    const handleOpen = () => {
        setHighlightSince(lastSeen);
        setIsWhatsNewOpen(true);
        markSeen();
    };

    return (
        <header className="bg-primary shadow-md fixed top-0 left-0 right-0 w-full z-50">
            <div className="flex items-center justify-between h-14 md:h-16 px-3">
                <div className="flex items-center gap-2">
                    <img src="/logo-192.png" alt="Shoppingo" className="h-9 w-9 md:h-11 md:w-11 rounded-md" />
                    <div className="flex flex-col items-start justify-center leading-none">
                        <span className="text-lg md:text-xl font-bold text-white">Shoppingo</span>
                        {typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ && (
                            <button
                                type="button"
                                onClick={handleOpen}
                                aria-label={`What's new in Shoppingo (version ${__APP_VERSION__})`}
                                className="mt-0.5 flex items-center gap-1 text-[10px] text-white/70 underline-offset-2 hover:text-white hover:underline"
                            >
                                v{__APP_VERSION__}
                                {hasUnseenRelease && (
                                    <span
                                        data-testid="whats-new-indicator"
                                        className="h-1.5 w-1.5 rounded-full bg-white"
                                    />
                                )}
                            </button>
                        )}
                    </div>
                </div>
                <SyncStatusBadge />
            </div>
            <WhatsNewDrawer open={isWhatsNewOpen} onOpenChange={setIsWhatsNewOpen} highlightSince={highlightSince} />
        </header>
    );
};

export default Appbar;
