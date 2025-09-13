import { AppConfig, ConfigState } from './types';

export const configState: ConfigState = {
    config: null,
    isLoading: false,
    error: null
};

export const loadConfig = async (): Promise<AppConfig> => {
    configState.isLoading = true;
    configState.error = null;

    try {
        const response = await fetch('/config.json');

        if (!response.ok) {
            throw new Error(`Failed to fetch config.json: ${response.status} ${response.statusText}`);
        }

        const configData = await response.json();

        if (!configData.AUTH_URL) {
            throw new Error('AUTH_URL is required in config.json');
        }

        configState.config = configData as AppConfig;
        configState.isLoading = false;

        return configState.config;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        configState.error = errorMessage;
        configState.isLoading = false;

        throw new Error(`Configuration failed to load: ${errorMessage}`);
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
