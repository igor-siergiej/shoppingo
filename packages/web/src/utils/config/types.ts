export interface AppConfig {
    /**
     * Self-hosted Umami analytics (jott #72, #138). `host` is the base URL the
     * tracker script `p.js` is served under (production: same-origin
     * `https://app.tandra.uk/pulse`). The web app is a no-op tracker when
     * `enabled` is `false` or the fields are missing — selfhost/.env.example
     * documents how to turn it on.
     */
    analytics?: {
        host?: string;
        websiteId?: string;
        enabled?: boolean;
    };
}

export interface ConfigState {
    config: AppConfig | null;
    isLoading: boolean;
    error: string | null;
}
