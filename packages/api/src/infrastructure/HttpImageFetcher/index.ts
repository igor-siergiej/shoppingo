import type { ImageFetcher } from '../../domain/RecipeImportService/types';

export interface HttpImageFetcherOptions {
    timeoutMs?: number;
    maxBytes?: number;
    userAgent?: string;
}

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0';

export class HttpImageFetcher implements ImageFetcher {
    private readonly timeoutMs: number;
    private readonly maxBytes: number;
    private readonly userAgent: string;

    constructor(options: HttpImageFetcherOptions = {}) {
        this.timeoutMs = options.timeoutMs ?? 8000;
        this.maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
        this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    }

    async fetchImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        let response: Response;
        try {
            response = await fetch(url, {
                signal: controller.signal,
                redirect: 'follow',
                headers: {
                    'User-Agent': this.userAgent,
                    Accept: 'image/*',
                },
            });
        } catch (error) {
            const message =
                (error as Error)?.name === 'AbortError' ? 'Timed out fetching image' : 'Failed to fetch image';
            throw Object.assign(new Error(message), { status: 502 });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            throw Object.assign(new Error(`Failed to fetch image: ${response.status}`), { status: 502 });
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.startsWith('image/')) {
            throw Object.assign(new Error(`Unsupported content type: ${contentType || 'unknown'}`), { status: 415 });
        }

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > this.maxBytes) {
            throw Object.assign(new Error('Image exceeds maximum allowed size'), { status: 413 });
        }

        return { buffer: Buffer.from(arrayBuffer), contentType };
    }
}
