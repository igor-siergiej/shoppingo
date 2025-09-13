export interface AppConfig {
    AUTH_URL: string;
}

export interface ConfigState {
    config: AppConfig | null;
    isLoading: boolean;
    error: string | null;
    hasFallback: boolean;
}

const configState: ConfigState = {
    config: null,
    isLoading: false,
    error: null,
    hasFallback: false
};

const fallbackConfig: AppConfig = {
    AUTH_URL: undefined
};

export const loadConfig = async (): Promise<AppConfig> => {
    configState.isLoading = true;
    configState.error = null;

    try {
        const response = await fetch('/config.json');

        const configData = await response.json();

        if (!configData.AUTH_URL) {
            throw new Error('AUTH_URL is required in config.json');
        }

        configState.config = configData as AppConfig;
        configState.isLoading = false;
        configState.hasFallback = false;

        return configState.config;
    } catch (error) {
        console.warn('Configuration failed to load, using fallback config:', error instanceof Error ? error.message : 'Unknown error');

        configState.config = fallbackConfig;
        configState.error = error instanceof Error ? error.message : 'Unknown error';
        configState.isLoading = false;
        configState.hasFallback = true;

        return configState.config;
    }
};

export const getConfig = (): AppConfig => {
    if (!configState.config) {
        throw new Error('Configuration not loaded.');
    }

    return configState.config;
};

export const getConfigState = (): ConfigState => {
    return { ...configState };
};

export const getAuthUrl = (): string => {
    return getConfig().AUTH_URL;
};
