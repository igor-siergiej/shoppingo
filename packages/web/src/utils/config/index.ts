import { getStorageItem, setStorageItem } from '@imapps/web-utils';
import type { AppConfig, ConfigState } from './types';

const CONFIG_STORAGE_KEY = 'shoppingo:config';

const configState: ConfigState = {
    config: null,
    isLoading: false,
    error: null,
};

const readCachedConfig = (): AppConfig | null => {
    const raw = getStorageItem(CONFIG_STORAGE_KEY, 'localStorage');
    if (!raw) return null;

    try {
        const cached = JSON.parse(raw);
        return cached.AUTH_URL ? (cached as AppConfig) : null;
    } catch {
        return null;
    }
};

// Config rarely changes, so a stale cached copy is preferable to blocking
// launch entirely when the network fetch fails while offline.
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
        setStorageItem(CONFIG_STORAGE_KEY, JSON.stringify(configState.config), 'localStorage');

        return configState.config;
    } catch (error) {
        const cached = readCachedConfig();
        if (cached) {
            configState.config = cached;
            configState.isLoading = false;
            return cached;
        }

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
