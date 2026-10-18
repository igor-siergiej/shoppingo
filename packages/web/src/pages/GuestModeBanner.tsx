import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useGuest } from '../guest/GuestContext';

// A persistent banner shown above the lists/items pages while the visitor
// is in guest mode. The CTA routes them to /register; a dismiss button
// hides the banner for the session (in-memory only — closing/reopening the
// tab brings it back, which is fine; we want them to know they can save).

interface GuestModeBannerProps {
    message?: string;
}

export const GuestModeBanner = ({ message }: GuestModeBannerProps) => {
    const navigate = useNavigate();
    const { isGuest } = useGuest();

    if (!isGuest) return null;

    return (
        <div
            data-testid="guest-mode-banner"
            className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
        >
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 space-y-1">
                <p className="font-medium">You're trying Shoppingo without an account.</p>
                <p className="text-amber-800 dark:text-amber-300">
                    {message ?? 'Your lists are stored on this device only. Sign up to keep them and unlock sharing.'}
                </p>
                <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-amber-900 underline-offset-2 hover:underline dark:text-amber-200"
                    onClick={() => navigate('/register')}
                >
                    Sign up to save your lists →
                </Button>
            </div>
        </div>
    );
};
