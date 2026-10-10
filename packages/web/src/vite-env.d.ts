/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_TIMESTAMP__: string;
declare const __IS_PROD__: boolean;

interface ImportMetaEnv {
    /** WebMCP origin-trial token; injected as an origin-trial meta tag in production builds only. */
    readonly VITE_WEBMCP_OT_TOKEN?: string;
}
