import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CNERecord, SessionUser, CNEParticipant } from '../types';
import { formatCneDateRangeDisplay, formatCneDateDisplay, formatCneDateTimeDisplay } from '../utils';

export interface CNERecordPdfOptions {
  fromDate?: string;
  toDate?: string;
  searchTerm?: string;
}

export function generateCNERecordsPdf(
  user: SessionUser,
  records: CNERecord[],
  options?: CNERecordPdfOptions | string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Build the complete filter description shown in the PDF.
  // Search and date filters are displayed independently so the document
  // accurately describes the records included in the table.
  const filterLines: string[] = [];
  if (options && typeof options === 'object') {
    const { fromDate, toDate, searchTerm } = options;
    const cleanedSearch = (searchTerm || '').trim();

    if (cleanedSearch) {
      filterLines.push(`Search: ${cleanedSearch}`);
    }

    if (fromDate && toDate) {
      filterLines.push(`Period: ${formatCneDateDisplay(fromDate)} – ${formatCneDateDisplay(toDate)}`);
    } else if (fromDate) {
      filterLines.push(`From: ${formatCneDateDisplay(fromDate)}`);
    } else if (toDate) {
      filterLines.push(`Up to: ${formatCneDateDisplay(toDate)}`);
    }
  } else if (typeof options === 'string' && options.trim()) {
    filterLines.push(options.trim());
  }

  if (filterLines.length === 0) {
    filterLines.push('All Available Records');
  }

  // Calculate totals accurately.
  let totalMinutes = 0;
  records.forEach((rec) => {
    const parts = (rec.duration || '1:00:00').split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    totalMinutes += hours * 60 + mins;
  });

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;
  const durationSummaryStr = remainingMins > 0
    ? `${totalHours} Hours ${remainingMins} Mins`
    : `${totalHours} Hours`;

  // 1. Institutional header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('ALL INDIA INSTITUTE OF MEDICAL SCIENCES, RISHIKESH', 105, 16, { align: 'center' });

  // 2. Document title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Clinical Nursing Education (CNE) Record', 105, 30, { align: 'center' });

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 40, 196, 40);

  // 3. Officer information & training summary
  const cardX = 14;
  const cardY = 44;
  const cardWidth = 182;
  const rightColumnX = 110;
  const rightColumnWidth = 80;

  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'normal');
  const wrappedFilterLines = filterLines.flatMap((line) => doc.splitTextToSize(line, rightColumnWidth));
  const filterValueStartY = 62;
  const filterLineHeight = 4.2;
  const filterEndY = filterValueStartY + Math.max(0, wrappedFilterLines.length - 1) * filterLineHeight;
  const sessionsY = filterEndY + 7;
  const durationY = sessionsY + 7;
  const minimumCardHeight = 34;
  const requiredCardHeight = durationY - cardY + 6;
  const cardHeight = Math.max(minimumCardHeight, requiredCardHeight);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'D');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('OFFICER INFORMATION & TRAINING SUMMARY', 18, 50);

  // Left column: officer identity
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Name:', 18, 57);
  doc.text('Employee ID:', 18, 64);
  doc.text('Designation:', 18, 71);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(user.name || 'N/A', 50, 57);
  doc.text(user.employeeId || 'N/A', 50, 64);
  doc.text(user.designation || 'N/A', 50, 71);

  // Right column: filter and summary metrics
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Record Filter:', rightColumnX, 57);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  wrappedFilterLines.forEach((line, index) => {
    doc.text(line, rightColumnX, filterValueStartY + index * filterLineHeight);
  });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('CNE Sessions:', rightColumnX, sessionsY);
  doc.text('Training Duration:', rightColumnX, durationY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${records.length} Sessions`, 154, sessionsY);
  doc.text(durationSummaryStr, 154, durationY);

  // 4. CNE records table
  const tableData = records.map((rec, index) => {
    const isResourcePerson = (rec.resourcePersonEmpId || '').toLowerCase().includes((user.employeeId || '').toLowerCase());
    const roleLabel = isResourcePerson ? 'Resource Person' : 'Participant';
    const dateDisplay = formatCneDateRangeDisplay(rec.fromDate, rec.toDate);

    return [
      (index + 1).toString(),
      dateDisplay,
      rec.area || 'General',
      rec.topic || 'Clinical Nursing Topic',
      rec.modeOfTeaching || 'Lecture',
      roleLabel,
      rec.duration || '1:00:00'
    ];
  });

  const tableStartY = cardY + cardHeight + 9;

  autoTable(doc, {
    startY: tableStartY,
    head: [['sn.', 'Date', 'Area / Ward', 'CNE Topic', 'Mode', 'Role', 'Duration']],
    body: tableData.length > 0
      ? tableData
      : [['-', '-', 'No CNE activities recorded for the selected filters', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2.1
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, halign: 'center' },
      2: { cellWidth: 32 },
      3: { cellWidth: 52 },
      4: { cellWidth: 26 },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' }
    },
    styles: {
      fontSize: 7.8,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  // 5. Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (finalY > pageHeight - 55) {
    doc.addPage();
  }

  const sigY = finalY > pageHeight - 55 ? 30 : finalY;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.line(16, sigY, 76, sigY);
  doc.text('Signature of Nursing Officer', 16, sigY + 5);
  doc.text(`(${user.name || 'Nursing Officer'})`, 16, sigY + 9);

  doc.line(134, sigY, 194, sigY);
  doc.text('Signature of CNE Coordinator', 134, sigY + 5);

  const sigY2 = sigY + 20;
  doc.line(75, sigY2, 135, sigY2);
  doc.text('Chairperson, CNE Committee / CNO', 105, sigY2 + 5, { align: 'center' });
  doc.text('AIIMS Rishikesh', 105, sigY2 + 9, { align: 'center' });

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Generated from the Clinical Nursing Education (CNE) Portal • AIIMS Rishikesh',
    105,
    pageHeight - 8,
    { align: 'center' }
  );

  const cleanName = (user.name || 'Officer').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`CNE_Record_${user.employeeId}_${cleanName}.pdf`);
}

export function generateCNESessionPdf(
  cne: CNERecord,
  participants: CNEParticipant[],
  averageScore?: number | null
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const postTestParticipants = participants.filter((p) => p.participantType === 'POST_TEST');
  const manualParticipants = participants.filter((p) => p.participantType === 'MANUAL');

  // Format Average Score strictly according to instructions:
  // "If there are no post-test submissions: Display: Not Available. Do NOT display: 0% unless an actual score of 0."
  let avgScoreDisplay = 'Not Available';
  if (postTestParticipants.length > 0) {
    if (averageScore !== undefined && averageScore !== null) {
      avgScoreDisplay = `${averageScore}%`;
    } else {
      const validScores = postTestParticipants.filter((p) => p.percentage !== null && !isNaN(p.percentage as number));
      if (validScores.length > 0) {
        const sum = validScores.reduce((acc, curr) => acc + (curr.percentage as number), 0);
        avgScoreDisplay = `${Math.round(sum / validScores.length)}%`;
      }
    }
  }

  // 1. Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('ALL INDIA INSTITUTE OF MEDICAL SCIENCES, RISHIKESH', 105, 16, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('CNE Session & Participant Evaluation Report', 105, 29, { align: 'center' });

  // Top Divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 33, 196, 33);

  // 2. Session Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 36, 182, 42, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 36, 182, 42, 2, 2, 'D');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CNE Session Specifications', 18, 42);

  // Left Column
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('CNE ID:', 18, 48);
  doc.text('Type of CNE:', 18, 54);
  doc.text('Topic:', 18, 60);
  doc.text('Area / Ward:', 18, 66);
  doc.text('Date & Time:', 18, 72);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(cne.cneId || cne.classId || '—', 48, 48);
  doc.text((cne.cneType || 'DEPARTMENTAL') === 'CENTRAL' ? 'Central CNE (Hospital-Wide)' : 'Departmental CNE', 48, 54);
  
  // Topic with truncation safeguard
  const cleanTopic = (cne.topic || 'Clinical Nursing Topic').slice(0, 48);
  doc.text(cleanTopic, 48, 60);
  doc.text(cne.area || 'General Clinical Area', 48, 66);
  const scheduleText = formatCneDateTimeDisplay(cne.date, cne.toDate);
  const durText = cne.duration ? ` (${cne.duration})` : '';
  doc.text(`${scheduleText}${durText}`, 48, 72);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Resource Person:', 116, 48);
  doc.text('Mode of Teaching:', 116, 54);
  doc.text('Session Status:', 116, 60);
  doc.text('Total Attendees:', 116, 66);
  doc.text('Avg Post-Test Score:', 116, 72);

  const resourcePersonDisplay = cne.resourcePersonName || 'Clinical Instructor';
  const modeDisplay = cne.modeOfTeaching || 'Lecture / Discussion';

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(resourcePersonDisplay, 152, 48);
  doc.text(modeDisplay, 152, 54);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cne.status === 'Completed' ? 16 : 30, cne.status === 'Completed' ? 185 : 41, cne.status === 'Completed' ? 129 : 59);
  doc.text(cne.status || 'Scheduled', 152, 60);
  
  doc.setTextColor(15, 23, 42);
  doc.text(`${participants.length} (${postTestParticipants.length} Test, ${manualParticipants.length} Manual)`, 152, 66);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(postTestParticipants.length > 0 ? 15 : 100, postTestParticipants.length > 0 ? 23 : 116, postTestParticipants.length > 0 ? 42 : 139);
  doc.text(avgScoreDisplay, 152, 72);

  // 3. Participants Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Attendance & Post-Test Evaluation Roster', 14, 84);

  const tableRows = participants.map((p, idx) => {
    const isManual = p.participantType === 'MANUAL';
    // Manual participants MUST NOT receive a fake post-test score!
    const scoreStr = isManual
      ? '— (Manual Attendance)'
      : (p.score !== null && p.totalQuestions !== null ? `${p.score}/${p.totalQuestions} (${p.percentage}%)` : '—');
    
    const statusStr = isManual
      ? 'ATTENDED'
      : (p.percentage !== null && p.percentage >= 50 ? 'PASSED' : 'COMPLETED');

    const formattedSubmittedAt = p.submittedAt ? formatCneDateDisplay(p.submittedAt) : '—';

    return [
      (idx + 1).toString(),
      p.employeeId || '—',
      p.name || 'Officer',
      p.designation || 'Nursing Officer',
      p.department || cne.area || '—',
      isManual ? 'MANUAL' : 'POST-TEST',
      scoreStr,
      statusStr,
      formattedSubmittedAt
    ];
  });

  autoTable(doc, {
    startY: 87,
    head: [['Sr', 'Emp ID', 'Officer Name', 'Designation', 'Area/Dept', 'Source', 'Score / %', 'Status', 'Date']],
    body: tableRows.length > 0 ? tableRows : [['-', '-', 'No participants recorded yet', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 34 },
      3: { cellWidth: 26 },
      4: { cellWidth: 22 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 26, halign: 'center' },
      7: { cellWidth: 16, halign: 'center' },
      8: { cellWidth: 16, halign: 'center' }
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  // 4. Signatures Section
  // Signatures Section: Left = Resource Person, Right = CNE Incharge, Centred Below = Chairperson
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (finalY > pageHeight - 55) {
    doc.addPage();
  }

  const safeFinalY = finalY > pageHeight - 55 ? 30 : finalY;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  // Left: Signature of Resource Person
  doc.line(16, safeFinalY, 76, safeFinalY);
  doc.text('Signature of Resource Person', 16, safeFinalY + 5);
  doc.text(`(${cne.resourcePersonName || 'Faculty / Instructor'})`, 16, safeFinalY + 9);

  // Right: Signature of CNE Incharge
  doc.line(134, safeFinalY, 194, safeFinalY);
  doc.text('Signature of CNE Incharge', 134, safeFinalY + 5);
  doc.text(`(${cne.area || 'Department'})`, 134, safeFinalY + 9);

  // Centred below: Chairperson, CNE Committee / CNO
  const safeFinalY2 = safeFinalY + 20;
  doc.line(75, safeFinalY2, 135, safeFinalY2);
  doc.text('Chairperson, CNE Committee / CNO', 105, safeFinalY2 + 5, { align: 'center' });
  doc.text('AIIMS Rishikesh', 105, safeFinalY2 + 9, { align: 'center' });

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Verified Institutional Post-Test Record • Clinical Nursing Education (CNE) Portal • AIIMS Rishikesh', 105, pageHeight - 8, { align: 'center' });

  const cleanCneId = (cne.cneId || cne.classId || 'CNE').replace(/[^a-zA-Z0-9-]/g, '_');
  doc.save(`CNE_Report_${cleanCneId}.pdf`);
}
