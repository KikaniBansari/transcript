import { jsPDF } from 'jspdf';
import { ExportData } from './exportUtils';

export const exportToPdf = (data: ExportData) => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4',
        });

        const marginX = 40;
        let cursorY = 40;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxWidth = pageWidth - marginX * 2;

        const addHeading = (text: string, size: number = 14) => {
            doc.setFontSize(size);
            doc.setFont('helvetica', 'bold');
            cursorY += 20;
            doc.text(text, marginX, cursorY);
            cursorY += 15;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
        };

        const addBodyText = (text: string) => {
            if (!text) return;
            const lines = doc.splitTextToSize(text, maxWidth);

            // Basic pagination logic
            for (const line of lines) {
                if (cursorY > doc.internal.pageSize.getHeight() - 40) {
                    doc.addPage();
                    cursorY = 40;
                }
                doc.text(line, marginX, cursorY);
                cursorY += 15;
            }
        };

        // --- Document Title ---
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(data.title || 'AI Meeting Notes', marginX, cursorY);
        cursorY += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Date: ${data.date}`, marginX, cursorY);
        cursorY += 20;
        doc.setTextColor(0);

        // --- Content Sections ---
        addHeading('Executive Summary');
        addBodyText(data.summary);

        addHeading('Key Points');
        data.keyPoints.forEach(point => addBodyText(`• ${point}`));

        addHeading('Action Items');
        if (data.actionItems.length) {
            data.actionItems.forEach(item => addBodyText(`□ ${item}`));
        } else {
            addBodyText('No action items detected.');
        }

        addHeading('Decisions');
        if (data.decisions.length) {
            data.decisions.forEach(item => addBodyText(`✓ ${item}`));
        } else {
            addBodyText('No major decisions detected.');
        }

        addHeading('Full Transcript');
        addBodyText(data.transcript);

        // Final save
        const safeTitle = data.title ? data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'meeting_notes';
        doc.save(`${safeTitle}_${data.date.replace(/[/:\s]/g, '-')}.pdf`);
    } catch (error) {
        console.error('Failed to generate PDF:', error);
        alert('Failed to generate PDF document.');
    }
};
