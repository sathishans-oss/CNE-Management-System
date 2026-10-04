import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CNERecord, SessionUser, CNEParticipant } from '../types';
import {
  formatCneDateRangeDisplay,
  formatCneDateDisplay,
  formatCneDateTimeDisplay,
  formatSecondsToDuration,
  isUserAssignedResourcePerson,
  parseDurationToSeconds
} from '../utils';

export interface CNERecordPdfOptions {
  fromDate?: string;
  toDate?: string;
  searchTerm?: string;
}

const normalizeEmployeeId = (value: unknown): string => String(value ?? '').trim().toUpperCase();

const splitEmployeeIds = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(normalizeEmployeeId).filter(Boolean);
  }
  return String(value ?? '')
    .split(/[,;\n]+/)
    .map(normalizeEmployeeId)
    .filter(Boolean);
};

const isUserParticipantInRecord = (user: SessionUser, record: CNERecord): boolean => {
  const employeeId = normalizeEmployeeId(user?.employeeId);
  if (!employeeId) return false;

  const participantIds = [
    ...splitEmployeeIds(record?.staffEmpId),
    ...splitEmployeeIds(record?.staffEmpIds)
  ];

  return participantIds.includes(employeeId);
};

const isUserResourcePersonInRecord = (user: SessionUser, record: CNERecord): boolean => {
  const combinedIds = [
    ...splitEmployeeIds(record?.resourcePersonEmpId),
    ...splitEmployeeIds(record?.resourcePersonEmpIds)
  ].join(',');

  return isUserAssignedResourcePerson(user, combinedIds);
};

const getDurationSeconds = (duration: unknown): number | null => {
  const raw = String(duration ?? '').trim();
  if (!raw) return null;
  return parseDurationToSeconds(raw);
};

const formatDurationForPdf = (duration: unknown): string => {
  const seconds = getDurationSeconds(duration);
  return seconds === null ? '—' : formatSecondsToDuration(seconds);
};

const formatPostTestScoreForPdf = (score: number | null | undefined): string => {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return '';
  }
  return `${Math.round(Number(score))}%`;
};

const formatTrainingDurationSummary = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const parts = [`${hours}h`];
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  return parts.join(' ');
};

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

  // Compute earned training duration and resource person hours independently.
  // If the same employee was both Participant and Resource Person for the same CNE, count that CNE duration in both totals.
  // Missing/invalid durations contribute zero; decimal-hour values such as 1.5 are parsed as 1 hour 30 minutes.
  let participantTrainingSeconds = 0;
  let resourcePersonTrainingSeconds = 0;

  records.forEach((rec) => {
    const seconds = getDurationSeconds(rec.duration) ?? 0;

    if (isUserParticipantInRecord(user, rec)) {
      participantTrainingSeconds += seconds;
    }

    if (isUserResourcePersonInRecord(user, rec)) {
      resourcePersonTrainingSeconds += seconds;
    }
  });

  const participantDurationStr = formatTrainingDurationSummary(participantTrainingSeconds);
  const resourcePersonDurationStr = formatTrainingDurationSummary(resourcePersonTrainingSeconds);

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
  const sessionsY = filterEndY + 6;
  const participantY = sessionsY + 6;
  const resourcePersonY = participantY + 6;
  const minimumCardHeight = 38;
  const requiredCardHeight = resourcePersonY - cardY + 6;
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
  doc.text('Participant Hours:', rightColumnX, participantY);
  doc.text('Resource Person Hours:', rightColumnX, resourcePersonY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${records.length} Sessions`, 154, sessionsY);
  doc.text(participantDurationStr, 154, participantY);
  doc.text(resourcePersonDurationStr, 154, resourcePersonY);

  // 4. CNE records table
  const tableData = records.map((rec, index) => {
    const isParticipant = isUserParticipantInRecord(user, rec);
    const isResourcePerson = isUserResourcePersonInRecord(user, rec);
    // Role label display
    const roleLabel = isParticipant ? 'Participant' : isResourcePerson ? 'Resource Person' : 'Linked Record';
    const dateDisplay = formatCneDateRangeDisplay(rec.fromDate, rec.toDate);

    const scoreDisplay = formatPostTestScoreForPdf(rec.myPostTestScore);

    return [
      (index + 1).toString(),
      dateDisplay,
      rec.topic || 'Clinical Nursing Topic',
      rec.modeOfTeaching || 'Lecture',
      roleLabel,
      formatDurationForPdf(rec.duration),
      scoreDisplay
    ];
  });

  const tableStartY = cardY + cardHeight + 9;

  autoTable(doc, {
    startY: tableStartY,
    head: [['sn.', 'Date', 'CNE Topic', 'Mode', 'Role', 'Duration', 'Post-Test Score']],
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
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 75 },
      3: { cellWidth: 22 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 14, halign: 'center' },
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

  // 2. Session Metadata Card with dynamic text wrapping and row height scaling
  const scheduleText = formatCneDateTimeDisplay(cne.date || cne.fromDate, cne.toDate);
  const durText = formatDurationForPdf(cne.duration) !== '—' ? ` (${formatDurationForPdf(cne.duration)})` : '';
  const fullScheduleText = `${scheduleText}${durText}`;

  const allResourcePersons = [
    cne.resourcePersonName,
    ...(Array.isArray(cne.externalResourcePersons) ? cne.externalResourcePersons : [])
  ].filter(Boolean).join(', ') || 'Clinical Instructor';

  const leftColValWidth = 62;
  const rightColValWidth = 44;
  const lineHeight = 3.8;
  const rowGap = 2.4;

  const metadataRows = [
    {
      leftLabel: 'CNE ID:',
      leftValue: doc.splitTextToSize(cne.cneId || cne.classId || '—', leftColValWidth),
      rightLabel: 'Resource Person:',
      rightValue: doc.splitTextToSize(allResourcePersons, rightColValWidth),
      isRightStatus: false,
      isRightScore: false
    },
    {
      leftLabel: 'Type of CNE:',
      leftValue: doc.splitTextToSize(
        (cne.cneType || 'DEPARTMENTAL') === 'CENTRAL' ? 'Central CNE (Hospital-Wide)' : 'Departmental CNE',
        leftColValWidth
      ),
      rightLabel: 'Mode of Teaching:',
      rightValue: doc.splitTextToSize(cne.modeOfTeaching || 'Lecture / Discussion', rightColValWidth),
      isRightStatus: false,
      isRightScore: false
    },
    {
      leftLabel: 'Topic:',
      leftValue: doc.splitTextToSize(cne.topic || 'Clinical Nursing Topic', leftColValWidth),
      rightLabel: 'Session Status:',
      rightValue: [cne.status || 'Scheduled'],
      isRightStatus: true,
      isRightScore: false
    },
    {
      leftLabel: 'Area / Ward:',
      leftValue: doc.splitTextToSize(cne.area || 'General Clinical Area', leftColValWidth),
      rightLabel: 'Total Attendees:',
      rightValue: doc.splitTextToSize(
        `${participants.length} (${postTestParticipants.length} Test, ${manualParticipants.length} Manual)`,
        rightColValWidth
      ),
      isRightStatus: false,
      isRightScore: false
    },
    {
      leftLabel: 'Date & Time:',
      leftValue: doc.splitTextToSize(fullScheduleText, leftColValWidth),
      rightLabel: 'Avg Post-Test Score:',
      rightValue: [avgScoreDisplay],
      isRightStatus: false,
      isRightScore: true
    }
  ];

  const cardStartY = 36;
  const headerOffset = 11;
  let runningY = cardStartY + headerOffset;
  const rowYPositions: number[] = [];

  for (const row of metadataRows) {
    rowYPositions.push(runningY);
    const maxLines = Math.max(row.leftValue.length, row.rightValue.length);
    const rowHeight = maxLines * lineHeight + rowGap;
    runningY += rowHeight;
  }

  const metadataCardHeight = (runningY - cardStartY) + 2;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, cardStartY, 182, metadataCardHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, cardStartY, 182, metadataCardHeight, 2, 2, 'D');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CNE Session Specifications', 18, 42);

  // Render rows with precise alignment and no overlapping
  metadataRows.forEach((row, i) => {
    const yPos = rowYPositions[i];

    // Left Column
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(row.leftLabel, 18, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(row.leftValue, 46, yPos, { lineHeightFactor: 1.15 });

    // Right Column
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(row.rightLabel, 114, yPos);

    if (row.isRightStatus) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(
        cne.status === 'Completed' ? 16 : 30,
        cne.status === 'Completed' ? 185 : 41,
        cne.status === 'Completed' ? 129 : 59
      );
      doc.text(row.rightValue[0], 148, yPos);
    } else if (row.isRightScore) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(
        postTestParticipants.length > 0 ? 15 : 100,
        postTestParticipants.length > 0 ? 23 : 116,
        postTestParticipants.length > 0 ? 42 : 139
      );
      doc.text(row.rightValue[0], 148, yPos);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(row.rightValue, 148, yPos, { lineHeightFactor: 1.15 });
    }
  });

  // 3. Participants Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const rosterTitleY = 36 + metadataCardHeight + 6;
  doc.text('Attendance & Post-Test Evaluation Roster', 14, rosterTitleY);

  const tableRows = participants.map((p, idx) => {
    const isManual = p.participantType === 'MANUAL';
    // Manual participants MUST NOT receive a fake post-test score.
    const scoreStr = isManual
      ? '— (Manual Attendance)'
      : (p.score !== null && p.totalQuestions !== null ? `${p.score}/${p.totalQuestions} (${p.percentage}%)` : '—');

    const storedStatus = String(p.status || '').trim().toUpperCase();
    const statusStr = isManual
      ? 'ATTENDED'
      : storedStatus === 'PASSED'
        ? 'PASSED'
        : storedStatus === 'NEEDS_IMPROVEMENT'
          ? 'NEEDS IMPROVEMENT'
          : (p.percentage !== null
            ? (p.percentage >= 60 ? 'PASSED' : 'NEEDS IMPROVEMENT')
            : 'COMPLETED');

    // Standard date-time display; the Date & Time column is deliberately wide enough to wrap.
    const formattedSubmittedAt = p.submittedAt ? formatCneDateTimeDisplay(p.submittedAt) : '—';

    return [
      (idx + 1).toString(),
      p.employeeId || '—',
      p.name || 'Officer',
      p.designation || 'Nursing Officer',
      scoreStr,
      statusStr,
      formattedSubmittedAt
    ];
  });

  autoTable(doc, {
    startY: rosterTitleY + 3,
    // Area/Dept and Source are intentionally removed from the session report.
    head: [['Sr', 'Emp ID', 'Officer Name', 'Designation', 'Score / %', 'Status', 'Date & Time']],
    body: tableRows.length > 0 ? tableRows : [['-', '-', 'No participants recorded yet', '-', '-', '-', '-']],
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
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 38 },
      3: { cellWidth: 34 },
      4: { cellWidth: 32, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 32, halign: 'center' }
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak',
      valign: 'middle'
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
