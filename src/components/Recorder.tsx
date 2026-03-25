'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Pause, Play } from 'lucide-react';
import { Button } from './Button';
import { useLiveTranscript } from '../hooks/useLiveTranscript';
import styles from './Recorder.module.css';

export interface MeetingInsights {
    transcript: string;
    title?: string;
    summary: string;
    keyPoints: string[];
    actionItems: string[];
    decisions: string[];
    rawAudioBlob?: Blob | null;
}

interface RecorderProps {
    onResults: (results: MeetingInsights) => void;
}

export const Recorder = React.memo<RecorderProps>(({ onResults }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        transcript: liveTranscript,
        isStreaming: isRecording,
        isPaused,
        rawAudioBlob,
        startStreaming,
        stopStreaming,
        pauseStreaming,
        resumeStreaming,
        error: streamError
    } = useLiveTranscript();

    // Format time as MM:SS
    const formatTime = React.useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const startRecording = async () => {
        setError(null);
        try {
            await startStreaming(selectedLanguage);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err: any) {
            console.error('Error starting live stream:', err);
            setError('Could not start live recording.');
        }
    };

    const togglePause = () => {
        if (isPaused) {
            resumeStreaming();
            // Resume timer
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } else {
            pauseStreaming();
            // Pause timer
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const stopRecording = async () => {
        const audioBlob = stopStreaming();
        if (timerRef.current) clearInterval(timerRef.current);

        setIsProcessing(true);
        setError(null);

        try {
            if (!liveTranscript || liveTranscript.trim() === '') {
                // Fallback: If Web Speech/Deepgram failed to generate a transcript but we have audio,
                // securely send the raw audio to our Whisper API.
                if (audioBlob && audioBlob.size > 0) {
                    await processAudioBlob(audioBlob, 'live_recording.webm');
                    return; // processAudioBlob handles state changes and invokes onResults
                } else {
                    throw new Error("No speech detected.");
                }
            }

            const response = await fetch('/api/summarize-transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: liveTranscript, language: selectedLanguage }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to summarize transcript.');
            }

            onResults({
                transcript: liveTranscript,
                title: data.insights.title,
                summary: data.insights.summary,
                keyPoints: data.insights.keyPoints,
                actionItems: data.insights.actionItems,
                decisions: data.insights.decisions,
                rawAudioBlob: rawAudioBlob, // from the hook
            });

        } catch (err: any) {
            console.error('Error summarizing:', err);
            setError(err.message || 'An error occurred summarizing the meeting.');
        } finally {
            setIsProcessing(false);
        }
    };

    const processAudioBlob = async (audioBlob: Blob, filename: string) => {
        setIsProcessing(true);
        setError(null);

        try {
            // 2. Prepare FormData
            const formData = new FormData();
            formData.append('audio', audioBlob, filename);
            formData.append('language', selectedLanguage);

            // 3. Send to API Route
            const response = await fetch('/api/process-audio', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process audio on the server.');
            }

            // 4. Pass back to parent
            onResults({
                transcript: data.transcript,
                title: data.insights.title,
                summary: data.insights.summary,
                keyPoints: data.insights.keyPoints,
                actionItems: data.insights.actionItems,
                decisions: data.insights.decisions,
                rawAudioBlob: audioBlob, // the uploaded file or chunks
            });
        } catch (err: any) {
            console.error('Error processing audio:', err);
            setError(err.message || 'An error occurred while processing the audio.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Removed handleStopRecording since we no longer rely on MediaRecorder blob capturing for live audio

    // --- Drag and Drop Handlers ---
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isRecording && !isProcessing) {
            setIsDragging(true);
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isRecording && !isProcessing) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (isRecording || isProcessing) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];

            // Basic validation
            if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav') && !file.name.endsWith('.m4a') && !file.name.endsWith('.webm')) {
                setError('Please upload a valid audio file (MP3, WAV, M4A, WEBM etc.)');
                return;
            }

            await processAudioBlob(file, file.name);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            await processAudioBlob(file, file.name);
        }
        // Reset the input specifically so users can re-upload the same file if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            // the custom hook manages its own media stream cleanup
        };
    }, []);

    return (
        <div
            className={`glass-panel ${styles.recorderCard} ${isDragging ? styles.dragging : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className={styles.visualizationStatus}>
                {isRecording ? (
                    <div className={styles.liveTranscriptContainer}>
                        <div className={styles.recordingPulseSmall}>
                            {!isPaused && <div className={`animate-pulse-record ${styles.pulseRing}`}></div>}
                            <Mic className={styles.recordingIcon} size={24} style={isPaused ? { opacity: 0.5 } : {}} />
                        </div>
                        <p className={styles.liveText} style={isPaused ? { opacity: 0.5 } : {}}>
                            {isPaused ? "Recording Paused." : (liveTranscript || "Listening...")}
                        </p>
                    </div>
                ) : isProcessing ? (
                    <div className={styles.processingState}>
                        <Loader2 className={styles.spinner} size={48} />
                        <p>Generating AI Summary...</p>
                    </div>
                ) : (
                    <div className={styles.idleState}>
                        <Mic className={styles.idleIcon} size={48} />
                        <p>Ready to record...</p>
                        <p className={styles.dragText}>or drag and drop an audio file here</p>
                    </div>
                )}
            </div>

            <div className={styles.timerWrapper}>
                <span className={isRecording ? styles.timerActive : styles.timerIdle}>
                    {formatTime(recordingTime)}
                </span>
            </div>

            {streamError && <div className={styles.errorAlert}>{streamError}</div>}
            {error && <div className={styles.errorAlert}>{error}</div>}

            <div className={styles.controls}>
                {!isRecording ? (
                    <div className={styles.actionGroup}>
                        <div className={styles.languageSelectorWrapper}>
                            <select
                                className={styles.languageSelect}
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                disabled={isProcessing}
                            >
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                                <option value="gu">Gujarati</option>
                            </select>
                        </div>
                        <Button
                            onClick={startRecording}
                            size="lg"
                            leftIcon={<Mic size={20} />}
                            disabled={isProcessing}
                            isLoading={isProcessing}
                        >
                            {isProcessing ? 'Processing AI...' : 'Start Recording'}
                        </Button>
                        <input
                            type="file"
                            accept="audio/*"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            size="lg"
                            disabled={isProcessing}
                        >
                            Upload File
                        </Button>
                    </div>
                ) : (
                    <div className={styles.actionGroup}>
                        <Button
                            onClick={togglePause}
                            variant="outline"
                            size="lg"
                            leftIcon={isPaused ? <Play size={16} /> : <Pause size={16} />}
                        >
                            {isPaused ? 'Resume' : 'Pause'}
                        </Button>
                        <Button
                            onClick={stopRecording}
                            variant="danger"
                            size="lg"
                            leftIcon={<Square fill="currentColor" size={16} />}
                        >
                            Stop Recording
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
});
