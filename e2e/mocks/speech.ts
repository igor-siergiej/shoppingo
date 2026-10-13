import type { Page } from '@playwright/test';

export type FakeSpeechScript =
    | { kind: 'transcript'; transcript: string; delayMs?: number }
    | { kind: 'error'; error: 'not-allowed' | 'no-speech' | 'audio-capture' | 'network' }
    | { kind: 'unsupported' };

/** Replaces the Web Speech API before the page loads; Chromium cannot drive a real microphone. */
export const installFakeSpeech = (page: Page, script: FakeSpeechScript) =>
    page.addInitScript((s: FakeSpeechScript) => {
        const w = window as unknown as Record<string, unknown>;
        if (s.kind === 'unsupported') {
            delete w.SpeechRecognition;
            delete w.webkitSpeechRecognition;
            return;
        }
        class FakeRecognition {
            lang = '';
            continuous = false;
            interimResults = false;
            onresult: ((event: unknown) => void) | null = null;
            onerror: ((event: { error: string }) => void) | null = null;
            onend: (() => void) | null = null;
            start() {
                const delay = s.kind === 'transcript' ? (s.delayMs ?? 50) : 50;
                setTimeout(() => {
                    if (s.kind === 'error') {
                        this.onerror?.({ error: s.error });
                    } else if (s.kind === 'transcript') {
                        this.onresult?.({
                            resultIndex: 0,
                            results: [{ isFinal: true, 0: { transcript: s.transcript } }],
                        });
                    }
                    this.onend?.();
                }, delay);
            }
            stop() {
                this.onend?.();
            }
            abort() {}
        }
        w.SpeechRecognition = FakeRecognition;
        w.webkitSpeechRecognition = FakeRecognition;
    }, script);
