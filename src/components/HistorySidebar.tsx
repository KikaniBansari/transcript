import React, { useState } from 'react';
import { Clock, ChevronRight, ChevronLeft, Trash2, FileText } from 'lucide-react';
import styles from './HistorySidebar.module.css';
import { MeetingInsights } from './Recorder';

export interface MeetingHistoryItem extends MeetingInsights {
    id: string;
    date: number;
}

interface HistorySidebarProps {
    history: MeetingHistoryItem[];
    onLoad: (item: MeetingHistoryItem) => void;
    onDelete: (id: string) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onLoad, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                className={`${styles.toggleButton} ${isOpen ? styles.open : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle History"
            >
                {isOpen ? <ChevronLeft size={24} /> : <Clock size={24} />}
            </button>

            <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                <div className={styles.header}>
                    <Clock size={20} className={styles.headerIcon} />
                    <h2>Meeting History</h2>
                </div>

                <div className={styles.historyList}>
                    {history.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No past meetings saved yet.</p>
                        </div>
                    ) : (
                        history.sort((a, b) => b.date - a.date).map((item) => (
                            <div key={item.id} className={styles.historyItem}>
                                <div className={styles.itemContent} onClick={() => { onLoad(item); setIsOpen(false); }}>
                                    <h3 className={styles.itemTitle}>{item.title || 'Meeting Notes'}</h3>
                                    <div className={styles.itemMeta}>
                                        <span className={styles.itemDate}>{new Date(item.date).toLocaleDateString()}</span>
                                        <span className={styles.itemCount}>{item.actionItems.length} Actions</span>
                                    </div>
                                </div>
                                <button
                                    className={styles.deleteButton}
                                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                    aria-label="Delete saved meeting"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Overlay to close sidebar on mobile */}
            {isOpen && (
                <div className={styles.overlay} onClick={() => setIsOpen(false)}></div>
            )}
        </>
    );
};
