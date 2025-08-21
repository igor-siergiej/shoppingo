export interface AppConfig {
    AUTH_URL: string;
}

let config: AppConfig | null = null;

export const loadConfig = async (): Promise<AppConfig> => {
    try {
        const response = await fetch('/config.json');

        if (!response.ok) {
            throw new Error(`Failed to load config.json: ${response.status} ${response.statusText}`);
        }

        const configData = await response.json();

        if (!configData.AUTH_URL) {
            throw new Error('AUTH_URL is required in config.json');
        }

        config = configData as AppConfig;

        return config;
    } catch (error) {
        throw new Error(`Configuration failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const getConfig = (): AppConfig => {
    if (!config) {
        throw new Error('Configuration not loaded.');
    }

    return config;
};

export const getAuthUrl = (): string => {
    return getConfig().AUTH_URL;
};
