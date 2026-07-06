import type { PageFetcher } from '../../domain/RecipeImportService/types';

export interface HttpPageFetcherOptions {
    timeoutMs?: number;
    maxBytes?: number;
    userAgent?: string;
}

// A realistic desktop UA so recipe sites serve full HTML rather than a bot/challenge page.
const DEFAULT_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export class HttpPageFetcher implements PageFetcher {
    private readonly timeoutMs: number;
    private readonly maxBytes: number;
    private readonly userAgent: string;

    constructor(options: HttpPageFetcherOptions = {}) {
        this.timeoutMs = options.timeoutMs ?? 8000;
        this.maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
        this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    }

    async fetchPage(url: string): Promise<string> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        let response: Response;
        try {
            response = await fetch(url, {
                signal: controller.signal,
                redirect: 'follow',
                headers: {
                    'User-Agent': this.userAgent,
                    Accept: 'text/html,application/xhtml+xml',
                },
            });
        } catch (error) {
            const message =
                (error as Error)?.name === 'AbortError' ? 'Timed out fetching page' : 'Failed to fetch page';
            throw Object.assign(new Error(message), { status: 502 });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            throw Object.assign(new Error(`Failed to fetch page: ${response.status}`), { status: 502 });
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (contentType && !contentType.includes('html') && !contentType.includes('xml')) {
            throw Object.assign(new Error(`Unsupported content type: ${contentType}`), { status: 415 });
        }

        return await this.readCapped(response);
    }

    // Stream the body and stop once maxBytes is reached, so a huge page can't exhaust memory.
    private async readCapped(response: Response): Promise<string> {
        const body = response.body;
        if (!body) {
            const text = await response.text();
            return text.slice(0, this.maxBytes);
        }

        const reader = body.getReader();
        const decoder = new TextDecoder();
        let received = 0;
        let html = '';

        while (received < this.maxBytes) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value.byteLength;
            html += decoder.decode(value, { stream: true });
        }
        await reader.cancel().catch(() => {});
        html += decoder.decode();

        // A single chunk may overshoot the cap; enforce it on the final string too.
        return html.slice(0, this.maxBytes);
    }
}
