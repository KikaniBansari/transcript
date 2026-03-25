
/**
 * Utility functions for exporting meeting notes.
 */

export interface ExportData {
    transcript: string;
    title?: string;
    summary: string;
    keyPoints: string[];
    actionItems: string[];
    decisions: string[];
    date: string;
}

const buildTextContent = (data: ExportData): string => {
    return `${data.title ? data.title.toUpperCase() : 'AI MEETING RECORDER - NOTES'}
Date: ${data.date}

=== EXECUTIVE SUMMARY ===
${data.summary}

=== KEY POINTS ===
${data.keyPoints.map(item => `- ${item}`).join('\n')}

=== ACTION ITEMS ===
${data.actionItems.length ? data.actionItems.map(item => `- [ ] ${item}`).join('\n') : 'No action items detected.'}

=== DECISIONS ===
${data.decisions.length ? data.decisions.map(item => `- ${item}`).join('\n') : 'No major decisions detected.'}

=== FULL TRANSCRIPT ===
${data.transcript}
`;
};

export const exportToTxt = (data: ExportData) => {
    const textContent = buildTextContent(data);
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const safeTitle = data.title ? data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'meeting_notes';
    link.download = `${safeTitle}_${data.date.replace(/[/:\s]/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const exportToMd = (data: ExportData) => {
    const mdContent = `# ${data.title || 'AI MEETING RECORDER - NOTES'}
**Date:** ${data.date}

## 📝 Executive Summary
${data.summary}

## 💡 Key Points
${data.keyPoints.map(item => `- ${item}`).join('\n')}

## ⚡ Action Items
${data.actionItems.length ? data.actionItems.map(item => `- [ ] ${item}`).join('\n') : 'No action items detected.'}

## 🎯 Decisions
${data.decisions.length ? data.decisions.map(item => `- ${item}`).join('\n') : 'No major decisions detected.'}

## 🎤 Full Transcript
${data.transcript}
`;
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const safeTitle = data.title ? data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'meeting_notes';
    link.download = `${safeTitle}_${data.date.replace(/[/:\s]/g, '-')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

