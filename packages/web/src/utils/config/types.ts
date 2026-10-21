export interface AppConfig {
    /**
     * Self-hosted Umami analytics. Per jott #72. The web app is a no-op
     * tracker when `enabled` is `false` or the fields are missing — the
     * selfhost .env.example documents how to turn it on.
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
