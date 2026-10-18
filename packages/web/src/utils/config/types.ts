export interface AppConfig {
    AUTH_URL: string;
    /**
     * Show a one-time banner on the OLD apex (`shoppingo.imapps.uk`) telling users
     * the app has moved to `https://app.shoppingo.imapps.uk` and they should
     * reinstall the PWA. Defaults to `false`; flipped on during the
     * shoppingo-app-subdomain-move #82 cutover window and off again once the
     * apex stops serving the app.
     */
    MOVE_BANNER_ENABLED?: boolean;
}

export interface ConfigState {
    config: AppConfig | null;
    isLoading: boolean;
    error: string | null;
}
