import { AlertCircle, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { loadConfig } from '../../utils/config';

/**
 * Host the banner is gated on. The apex stays on the landing site after #82, but during
 * the cutover window the apex briefly still serves the app — that's the only moment this
 * banner should appear.
 */
const OLD_HOST = 'shoppingo.imapps.uk';
const NEW_APP_URL = 'https://shoppingo-app.imapps.uk';

const SiteMoveBanner = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let cancelled = false;
        // Only on the OLD apex (i.e. on the live-app apex during cutover).
        if (window.location.host !== OLD_HOST) {
            return () => {
                cancelled = true;
            };
        }

        // Config is loaded by ConfigLoader above this in the tree, but reading it
        // again here keeps the banner self-contained — loadConfig is idempotent and
        // reads from cache after the first call.
        void loadConfig()
            .then((config) => {
                if (cancelled) return;
                setVisible(config.MOVE_BANNER_ENABLED === true);
            })
            .catch(() => {
                // If config can't load, the banner stays hidden — fail closed.
                if (cancelled) return;
                setVisible(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    if (!visible) return null;

    return (
        <div className="fixed top-[80px] left-0 right-0 z-50 px-4" role="alert" data-testid="site-move-banner">
            <div className="mx-auto max-w-[500px]">
                <Alert className="border-warning/40 text-warning bg-warning/10 animate-in fade-in-50 slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 mt-[2px]" aria-hidden="true" />
                        <div className="flex-1">
                            <AlertTitle>Shoppingo has moved</AlertTitle>
                            <AlertDescription>
                                Open <span className="font-medium">shoppingo-app.imapps.uk</span> and reinstall the app
                                to keep getting push notifications and offline sync. Your data carries over.
                            </AlertDescription>
                        </div>
                        <a
                            className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                            href={NEW_APP_URL}
                            rel="noopener noreferrer"
                        >
                            Open <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                    </div>
                </Alert>
            </div>
        </div>
    );
};

export default SiteMoveBanner;
