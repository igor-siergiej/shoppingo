import { useCallback, useEffect, useRef, useState } from 'react';
import { getSpeechRecognition, type SpeechRecognitionLike } from '../utils/speechRecognition';

const ERROR_MESSAGES: Record<string, string> = {
    'not-allowed': 'Microphone access was blocked. Allow it in your browser settings to use voice.',
    'service-not-allowed': 'Microphone access was blocked. Allow it in your browser settings to use voice.',
    'no-speech': "I didn't hear anything. Try again.",
    'audio-capture': 'No microphone was found.',
    network: 'Speech recognition needs a connection. Try again when you are online.',
};

export interface UseSpeechRecognition {
    supported: boolean;
    listening: boolean;
    transcript: string;
    error: string | null;
    start: () => void;
    stop: () => void;
    reset: () => void;
}

export const useSpeechRecognition = (lang = navigator.language || 'en-US'): UseSpeechRecognition => {
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const supported = getSpeechRecognition() !== null;

    useEffect(() => () => recognitionRef.current?.abort(), []);

    const start = useCallback(() => {
        const Ctor = getSpeechRecognition();
        if (!Ctor) return;

        const recognition = new Ctor();
        recognition.lang = lang;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
            setTranscript(
                Array.from(event.results)
                    .map((result) => result[0].transcript)
                    .join(' ')
                    .trim()
            );
        };
        recognition.onerror = (event) => {
            setError(ERROR_MESSAGES[event.error] ?? 'Voice input failed. Try again.');
            setListening(false);
        };
        recognition.onend = () => setListening(false);

        recognitionRef.current = recognition;
        setTranscript('');
        setError(null);
        setListening(true);
        recognition.start();
    }, [lang]);

    const stop = useCallback(() => recognitionRef.current?.stop(), []);

    const reset = useCallback(() => {
        recognitionRef.current?.abort();
        setListening(false);
        setTranscript('');
        setError(null);
    }, []);

    return { supported, listening, transcript, error, start, stop, reset };
};
