interface ImportErrorBannerProps {
    importError: string;
    isImporting: boolean;
    link: string;
    onRetry: () => void;
}

export const ImportErrorBanner = ({ importError, isImporting, link, onRetry }: ImportErrorBannerProps) => {
    if (!importError) return null;

    return (
        <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span>{importError}</span>
            <button
                type="button"
                onClick={onRetry}
                disabled={isImporting || !link.trim()}
                className="shrink-0 font-medium underline disabled:opacity-50"
            >
                Retry
            </button>
        </div>
    );
};
