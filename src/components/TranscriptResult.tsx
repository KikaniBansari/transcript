import React from 'react';
import { AlignLeft, CheckCircle, FileText, Download } from 'lucide-react';
import styles from './TranscriptResult.module.css';
import { Button } from './Button';
import { AnimatedCounter } from './AnimatedCounter';

interface TranscriptResultProps {
    transcript: string;
    title?: string;
    summary: string;
    keyPoints: string[];
    actionItems: string[];
    decisions: string[];
    onExportTxt: () => void;
    onExportPdf: () => void;
    onExportMd: () => void;
    onSaveNotes: () => void;
    rawAudioBlob?: Blob | null;
}

export const TranscriptResult = React.memo<TranscriptResultProps>(({
    transcript,
    title,
    summary,
    keyPoints,
    actionItems,
    decisions,
    onExportTxt,
    onExportPdf,
    onExportMd,
    onSaveNotes,
    rawAudioBlob,
}) => {
    const handleDownloadAudio = () => {
        if (!rawAudioBlob) return;
        const url = URL.createObjectURL(rawAudioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting_audio_${new Date().getTime()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
    };
    return (
        <div className={styles.container}>
            {/* Header with Actions */}
            <div className={styles.header}>
                <h2 className={styles.title}>{title || 'Meeting Insights'}</h2>
                <div className={styles.actions}>
                    <Button variant="outline" size="sm" onClick={onExportTxt}>
                        <Download size={16} /> TXT
                    </Button>
                    <Button variant="outline" size="sm" onClick={onExportMd}>
                        <Download size={16} /> MD
                    </Button>
                    <Button variant="outline" size="sm" onClick={onExportPdf}>
                        <Download size={16} /> PDF
                    </Button>
                    {rawAudioBlob && (
                        <Button variant="outline" size="sm" onClick={handleDownloadAudio}>
                            <Download size={16} /> WebM
                        </Button>
                    )}
                    <Button variant="primary" size="sm" onClick={onSaveNotes}>
                        Save Notes
                    </Button>
                </div>
            </div>

            <div className={styles.grid}>
                {/* Left Column: AI Summary */}
                <div className={styles.leftColumn}>

                    <section className={`glass-panel ${styles.sectionBlock}`}>
                        <div className={styles.sectionHeader}>
                            <FileText className={styles.sectionIcon} />
                            <h3>Executive Summary</h3>
                        </div>
                        <p className={styles.paragraph}>{summary}</p>
                    </section>

                    <section className={`glass-panel ${styles.sectionBlock}`}>
                        <div className={styles.sectionHeader}>
                            <AlignLeft className={styles.sectionIcon} />
                            <h3>Key Points</h3>
                        </div>
                        <ul className={styles.list}>
                            {keyPoints.map((point, index) => (
                                <li key={index}>{point}</li>
                            ))}
                        </ul>
                    </section>

                    <div className={styles.rowGrid}>
                        <section className={`glass-panel ${styles.sectionBlock}`}>
                            <div className={styles.sectionHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle className={`${styles.sectionIcon} ${styles.actionColor}`} />
                                    <h3>Action Items</h3>
                                </div>
                                <AnimatedCounter value={actionItems.length} />
                            </div>
                            <ul className={styles.list}>
                                {actionItems.length > 0 ? (
                                    actionItems.map((item, index) => <li key={index}>{item}</li>)
                                ) : (
                                    <li className={styles.empty}>No action items detected</li>
                                )}
                            </ul>
                        </section>

                        <section className={`glass-panel ${styles.sectionBlock}`}>
                            <div className={styles.sectionHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle className={`${styles.sectionIcon} ${styles.decisionColor}`} />
                                    <h3>Decisions</h3>
                                </div>
                                <AnimatedCounter value={decisions.length} />
                            </div>
                            <ul className={styles.list}>
                                {decisions.length > 0 ? (
                                    decisions.map((decision, index) => <li key={index}>{decision}</li>)
                                ) : (
                                    <li className={styles.empty}>No major decisions detected</li>
                                )}
                            </ul>
                        </section>
                    </div>
                </div>

                {/* Right Column: Full Transcript */}
                <div className={styles.rightColumn}>
                    <section className={`glass-panel ${styles.sectionBlock} ${styles.transcriptBlock}`}>
                        <div className={styles.sectionHeader}>
                            <AlignLeft className={styles.sectionIcon} />
                            <h3>Full Transcript</h3>
                        </div>
                        <div className={styles.scrollArea}>
                            <p className={styles.transcriptText}>
                                {transcript || 'No transcript generated yet.'}
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
});
