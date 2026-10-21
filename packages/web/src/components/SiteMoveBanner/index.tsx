import { AlertCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { usePWA } from '../../hooks/usePWA';
import { clearSiteMovePending, isSiteMovePending, wasForwardedFromOldAddress } from '../../utils/siteMove';
import { Button } from '../ui/button';

// The old install can't install the new one from inside itself, so it gets browser instructions
// instead of the install button.
const MoveInstructions = ({ inOldInstall }: { inOldInstall: boolean }) => {
    const { canInstall, installApp } = usePWA();

    if (inOldInstall) {
        return (
            <AlertDescription>
                This is the old Shoppingo app. Open <span className="font-medium">app.tandra.uk</span> in your browser,
                install it from there, then remove this one to keep getting notifications.
            </AlertDescription>
        );
    }

    return (
        <>
            <AlertDescription>
                Shoppingo now lives at <span className="font-medium">app.tandra.uk</span>. If you installed it on your
                home screen or desktop, remove the old one and install it again from here to keep getting notifications.
            </AlertDescription>
            {canInstall && (
                <Button className="mt-2" size="sm" onClick={() => void installApp()}>
                    Install app
                </Button>
            )}
        </>
    );
};

/**
 * Asks people forwarded from an old address (see utils/siteMove.ts) to reinstall the app from
 * this one: their installed copy still opens the old address and gets no notifications. An app
 * window opened through the forward is the old install; any other app window is the new one.
 */
const SiteMoveBanner = () => {
    const { isInstalled } = usePWA();
    const [pending, setPending] = useState(isSiteMovePending);
    const [inOldInstall] = useState(() => isInstalled && wasForwardedFromOldAddress());
    const inNewInstall = isInstalled && !inOldInstall;

    // Opening the app from its new install (banner button or browser UI) finishes the move.
    useEffect(() => {
        if (pending && inNewInstall) {
            clearSiteMovePending();
            setPending(false);
        }
    }, [pending, inNewInstall]);

    if (!pending || inNewInstall) return null;

    const dismiss = () => {
        clearSiteMovePending();
        setPending(false);
    };

    return (
        <div className="fixed top-[80px] left-0 right-0 z-50 px-4" role="alert" data-testid="site-move-banner">
            <div className="mx-auto max-w-[500px]">
                <Alert className="border-warning/40 text-warning bg-warning/10 animate-in fade-in-50 slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 mt-[2px]" aria-hidden="true" />
                        <div className="flex-1">
                            <AlertTitle>Shoppingo has moved</AlertTitle>
                            <MoveInstructions inOldInstall={inOldInstall} />
                        </div>
                        <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={dismiss}>
                            <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </div>
                </Alert>
            </div>
        </div>
    );
};

export default SiteMoveBanner;
