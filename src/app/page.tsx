'use client';

import { Mic, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";
import { Recorder, MeetingInsights } from "@/components/Recorder";
import dynamic from "next/dynamic";
import { exportToTxt, exportToMd } from "@/lib/exportUtils";
import { HistorySidebar, MeetingHistoryItem } from "@/components/HistorySidebar";

const TranscriptResult = dynamic(
  () => import("@/components/TranscriptResult").then(mod => mod.TranscriptResult),
  { ssr: false }
);

export default function Home() {
  const [insights, setInsights] = useState<MeetingInsights | null>(null);
  const [history, setHistory] = useState<MeetingHistoryItem[]>([]);

  // Load saved notes on mount
  useEffect(() => {
    const saved = localStorage.getItem('ai_meeting_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved notes");
      }
    }
  }, []);

  const handleSaveNotes = useCallback(() => {
    if (insights) {
      const newItem: MeetingHistoryItem = {
        ...insights,
        id: Date.now().toString(),
        date: Date.now(),
      };
      // Check if this precise transcript is already the first item in history to prevent double-saving
      if (history.length > 0 && history[0].transcript === insights.transcript) {
        toast.error("Already saved to history.");
        return;
      }
      const newHistory = [newItem, ...history];
      setHistory(newHistory);
      localStorage.setItem('ai_meeting_history', JSON.stringify(newHistory));
      toast.success('Meeting saved to history!');
    }
  }, [insights, history]);

  const handleDeleteHistory = useCallback((id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('ai_meeting_history', JSON.stringify(newHistory));
    toast.success('Meeting deleted.');
  }, [history]);

  const handleExportTxt = useCallback(() => {
    if (insights) {
      exportToTxt({
        ...insights,
        date: new Date().toLocaleDateString()
      });
      toast.success('Downloaded as TXT');
    }
  }, [insights]);

  const handleExportMd = useCallback(() => {
    if (insights) {
      exportToMd({
        ...insights,
        date: new Date().toLocaleDateString()
      });
      toast.success('Downloaded as Markdown');
    }
  }, [insights]);

  const handleExportPdf = useCallback(async () => {
    if (insights) {
      toast.loading('Generating PDF...', { id: 'pdf-toast' });
      try {
        // Lazy load the heavy jsPDF library only when needed
        const { exportToPdf } = await import('@/lib/exportPdf');
        exportToPdf({
          ...insights,
          date: new Date().toLocaleDateString()
        });
        toast.success('Downloaded as PDF', { id: 'pdf-toast' });
      } catch (err) {
        console.error(err);
        toast.error('Failed to generate PDF', { id: 'pdf-toast' });
      }
    }
  }, [insights]);

  const clearMeeting = useCallback(() => {
    setInsights(null);
    toast.success('Meeting cleared.');
  }, []);

  return (
    <>
      <HistorySidebar history={history} onLoad={setInsights} onDelete={handleDeleteHistory} />
      <main className={styles.container}>
        <header className={styles.header}>
          <div className={styles.logoContainer}>
            <div className={styles.iconWrapper}>
              <Mic className={styles.logoIcon} size={24} />
            </div>
            <h1 className={styles.title}>AI Meeting Recorder</h1>
          </div>
          <p className={styles.subtitle}>
            Record, transcribe, and extract actionable insights instantly.
          </p>
        </header>

        <section className={styles.mainContent}>
          {/* Left Side (or Top on Mobile): The Recorder */}
          <div className={styles.recorderSection}>
            <Recorder
              onResults={(newInsights) => {
                setInsights(newInsights);
                toast.success('Meeting successfully analyzed!');
              }}
            />
            {insights && (
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={clearMeeting}
                  className={styles.clearButton}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
                    border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1.5rem',
                    borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease',
                    fontWeight: '500'
                  }}
                >
                  <Trash2 size={18} />
                  Start New Meeting
                </button>
              </div>
            )}
          </div>

          {/* Right Side (or Bottom on Mobile): The Results */}
          <div className={styles.resultsSection}>
            {insights ? (
              <TranscriptResult
                transcript={insights.transcript}
                title={insights.title}
                summary={insights.summary}
                keyPoints={insights.keyPoints}
                actionItems={insights.actionItems}
                decisions={insights.decisions}
                onExportTxt={handleExportTxt}
                onExportPdf={handleExportPdf}
                onExportMd={handleExportMd}
                onSaveNotes={handleSaveNotes}
                rawAudioBlob={insights.rawAudioBlob}
              />
            ) : (
              <div className={`glass-panel ${styles.placeholderCard}`}>
                <div>
                  <Mic size={32} style={{ color: 'var(--card-border)', marginBottom: '1rem' }} />
                  <h2>No Insights Yet</h2>
                  <p>Start recording a meeting to generate AI summaries, action items, and decisions.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className={styles.footer}>
          <p>Built with Next.js & OpenAI</p>
        </footer>
      </main>
    </>
  );
}
