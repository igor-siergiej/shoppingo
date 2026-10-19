import { AlertCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { usePWA } from '../../hooks/usePWA';
import { clearSiteMovePending, isSiteMovePending } from '../../utils/siteMove';
import { Button } from '../ui/button';

/**
 * Asks people forwarded from the old address (see utils/siteMove.ts) to reinstall the app from
 * this one: their installed copy still opens the landing site and gets no notifications. Hidden
 * inside an installed window, where the user is already on the new install.
 */
const SiteMoveBanner = () => {
    const { canInstall, isInstalled, installApp } = usePWA();
    const [pending, setPending] = useState(isSiteMovePending);

    // Installing from this address (banner button or browser UI) finishes the move.
    useEffect(() => {
        if (pending && isInstalled) {
            clearSiteMovePending();
            setPending(false);
        }
    }, [pending, isInstalled]);

    if (!pending || isInstalled) return null;

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
                            <AlertDescription>
                                Shoppingo now lives at <span className="font-medium">shoppingo-app.imapps.uk</span>. If
                                you installed it on your home screen or desktop, remove the old one and install it again
                                from here to keep getting notifications.
                            </AlertDescription>
                            {canInstall && (
                                <Button className="mt-2" size="sm" onClick={() => void installApp()}>
                                    Install app
                                </Button>
                            )}
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
