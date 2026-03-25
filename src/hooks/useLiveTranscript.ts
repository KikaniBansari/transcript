import { useState, useRef, useCallback } from 'react';

interface UseLiveTranscriptResult {
    transcript: string;
    isStreaming: boolean;
    isPaused: boolean;
    rawAudioBlob: Blob | null;
    startStreaming: (language: string) => Promise<void>;
    stopStreaming: () => Blob | null;
    pauseStreaming: () => void;
    resumeStreaming: () => void;
    error: string | null;
}

export const useLiveTranscript = (): UseLiveTranscriptResult => {
    const [transcript, setTranscript] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [rawAudioBlob, setRawAudioBlob] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const microphoneRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<any>(null); // For Web Speech API Fallback
    const finalTranscriptRef = useRef<string>(''); // For tracking Web Speech final text gracefully
    const audioChunksRef = useRef<Blob[]>([]);
    const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const startStreaming = useCallback(async (language: string = 'en') => {
        setError(null);
        setTranscript('');
        setRawAudioBlob(null);
        setIsPaused(false);
        audioChunksRef.current = [];
        finalTranscriptRef.current = '';
        if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);

        // --- Web Speech API Fallback for Gujarati ---
        // Deepgram Nova-2 does not natively stream Gujarati, so we fall back to the browser's deeply integrated engine.
        if (language === 'gu') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                setError("Your browser does not support live Gujarati transcription. Please use Google Chrome.");
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                microphoneRef.current = mediaRecorder;

                mediaRecorder.addEventListener('dataavailable', (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                });

                mediaRecorder.start(250);

                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'gu-IN';

                recognition.onresult = (event: any) => {
                    let interimTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscriptRef.current += event.results[i][0].transcript + ' ';
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                    setTranscript((finalTranscriptRef.current + interimTranscript).trim());
                };

                recognition.onerror = (e: any) => {
                    // Ignore no-speech events as they trigger frequently during silence
                    if (e.error !== 'no-speech') {
                        console.error("Speech recognition error:", e.error);
                    }
                };

                // Attempt to constantly restart if the browser force-stops the native stream, unless we manually stop it
                recognition.onend = () => {
                    if (microphoneRef.current && microphoneRef.current.state === 'recording') {
                        try { recognition.start(); } catch (e) { }
                    }
                };

                recognition.start();
                recognitionRef.current = recognition;

                setIsStreaming(true);
            } catch (err: any) {
                console.error("Microphone access error:", err);
                setError("Microphone access denied. Please allow audio recording.");
            }
            return; // Skip deepgram entirely
        }

        try {
            // 1. Fetch Temporary Token
            const authRes = await fetch('/api/auth/deepgram');
            if (!authRes.ok) {
                throw new Error('Failed to authenticate with Deepgram streaming server');
            }
            const { key } = await authRes.json();

            // 2. Open WebSocket to Deepgram
            const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?profanity_filter=false&smart_format=true&model=nova-2&language=${language}`, [
                'token',
                key,
            ]);

            socketRef.current = socket;

            socket.onopen = async () => {
                setIsStreaming(true);

                // 3. Connect Microphone and pipe data
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                    microphoneRef.current = mediaRecorder;

                    mediaRecorder.addEventListener('dataavailable', (event) => {
                        if (event.data.size > 0) {
                            audioChunksRef.current.push(event.data);
                            if (socket.readyState === WebSocket.OPEN) {
                                socket.send(event.data);
                            }
                        }
                    });

                    mediaRecorder.start(250); // send chunks every 250ms for low latency
                } catch (micErr) {
                    console.error("Microphone access error:", micErr);
                    setError("Microphone access denied. Please allow audio recording.");
                    stop();
                }
            };

            socket.onmessage = (message) => {
                const received = JSON.parse(message.data);

                // Deepgram sometimes sends empty metadata messages
                if (!received.channel || !received.channel.alternatives) return;

                const alt = received.channel.alternatives[0];
                const transcriptText = alt.transcript;

                if (transcriptText && received.is_final) {
                    setTranscript((prev) => {
                        if (!prev) return transcriptText;
                        return prev + " " + transcriptText;
                    });
                }
            };

            socket.onclose = () => {
                setIsStreaming(false);
            };

            socket.onerror = (e) => {
                console.error("WebSocket error", e);
                setError("Error connecting to live transcription service.");
            };

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred setting up the live stream.');
        }
    }, []);

    const pauseStreaming = useCallback(() => {
        if (microphoneRef.current && microphoneRef.current.state === 'recording') {
            microphoneRef.current.pause();
            setIsPaused(true);

            if (recognitionRef.current) {
                recognitionRef.current.stop();
            } else {
                // Send KeepAlive to Deepgram every 8 seconds to prevent timeout
                keepAliveIntervalRef.current = setInterval(() => {
                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                        socketRef.current.send(JSON.stringify({ type: 'KeepAlive' }));
                    }
                }, 8000);
            }
        }
    }, []);

    const resumeStreaming = useCallback(() => {
        if (microphoneRef.current && microphoneRef.current.state === 'paused') {
            microphoneRef.current.resume();
            setIsPaused(false);

            if (recognitionRef.current) {
                try { recognitionRef.current.start(); } catch (e) { }
            } else {
                if (keepAliveIntervalRef.current) {
                    clearInterval(keepAliveIntervalRef.current);
                }
            }
        }
    }, []);

    const stopStreaming = useCallback((): Blob | null => {
        let blobToReturn: Blob | null = null;
        if (keepAliveIntervalRef.current) {
            clearInterval(keepAliveIntervalRef.current);
        }

        if (microphoneRef.current && microphoneRef.current.state !== 'inactive') {
            if (microphoneRef.current.state === 'paused') {
                microphoneRef.current.resume(); // Must resume before stopping to flush data
            }
            microphoneRef.current.stop();
            microphoneRef.current.stream.getTracks().forEach((track) => track.stop());

            // Generate the raw Blob
            if (audioChunksRef.current.length > 0) {
                blobToReturn = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setRawAudioBlob(blobToReturn);
            }
        }

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            // Send an empty message to let Deepgram know we are done
            socketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
            socketRef.current.close();
        }

        if (recognitionRef.current) {
            recognitionRef.current.onend = null; // prevent auto-restart logic
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }

        setIsStreaming(false);
        setIsPaused(false);
        return blobToReturn;
    }, []);

    return {
        transcript,
        isStreaming,
        isPaused,
        rawAudioBlob,
        startStreaming,
        stopStreaming,
        pauseStreaming,
        resumeStreaming,
        error,
    };
};
