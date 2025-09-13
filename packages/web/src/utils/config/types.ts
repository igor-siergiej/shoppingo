export interface AppConfig {
    AUTH_URL: string;
}

export interface ConfigState {
    config: AppConfig | null;
    isLoading: boolean;
    error: string | null;
}
