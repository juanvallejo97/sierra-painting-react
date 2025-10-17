/**
 * Payroll Report PDF Generator
 *
 * Generates professional PDF reports for payroll data including employee hours,
 * pay calculations, and job cost breakdowns.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PayrollReport } from '../hooks/usePayrollReports';
import type { CompanyInfo } from '../types/invoice';

/**
 * Generate payroll report PDF
 */
export async function generatePayrollPDF(
  report: PayrollReport,
  companyInfo: CompanyInfo
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Add company logo if available
  if (companyInfo.logo) {
    try {
      doc.addImage(companyInfo.logo, 'JPEG', 15, yPos, 40, 20);
      yPos += 25;
    } catch (error) {
      console.error('Failed to add logo to PDF:', error);
      // Continue without logo
    }
  }

  // Company info
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(companyInfo.name, 15, yPos);
  yPos += 5;

  if (companyInfo.address) {
    doc.text(companyInfo.address, 15, yPos);
    yPos += 5;
  }

  if (companyInfo.phone) {
    doc.text(`Phone: ${companyInfo.phone}`, 15, yPos);
    yPos += 5;
  }

  if (companyInfo.email) {
    doc.text(`Email: ${companyInfo.email}`, 15, yPos);
    yPos += 5;
  }

  yPos += 10;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text('Payroll Report', 15, yPos);
  yPos += 10;

  // Date range
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const startDate = report.dateRange.startDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const endDate = report.dateRange.endDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  doc.text(`Period: ${startDate} - ${endDate}`, 15, yPos);
  yPos += 15;

  // Summary section
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Summary', 15, yPos);
  yPos += 8;

  // Summary table
  const summaryData = [
    ['Total Hours', report.summary.totalHours.toFixed(2)],
    ['Total Payroll', `$${report.summary.totalPay.toFixed(2)}`],
    ['Employees', report.summary.employeeCount.toString()],
    ['Time Entries', report.summary.entriesCount.toString()],
    ['Approved Entries', report.summary.approvedEntries.toString()],
    ['Pending Entries', report.summary.pendingEntries.toString()],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [66, 66, 66] },
    margin: { left: 15, right: 15 },
    tableWidth: pageWidth - 30,
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Employee payroll breakdown
  doc.setFontSize(14);
  doc.text('Employee Payroll Breakdown', 15, yPos);
  yPos += 8;

  const employeeData = report.employees.map((emp) => [
    emp.employeeName,
    emp.totalHours.toFixed(2),
    `$${emp.hourlyRate.toFixed(2)}`,
    `$${emp.totalPay.toFixed(2)}`,
    emp.entriesCount.toString(),
    emp.jobsWorked.length.toString(),
  ]);

  // Add total row
  employeeData.push([
    'TOTAL',
    report.summary.totalHours.toFixed(2),
    '-',
    `$${report.summary.totalPay.toFixed(2)}`,
    report.summary.entriesCount.toString(),
    '-',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Employee', 'Hours', 'Rate', 'Total Pay', 'Entries', 'Jobs']],
    body: employeeData,
    theme: 'grid',
    headStyles: { fillColor: [66, 66, 66] },
    margin: { left: 15, right: 15 },
    tableWidth: pageWidth - 30,
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    didParseCell: function (data) {
      // Make total row bold
      if (data.row.index === employeeData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPos > doc.internal.pageSize.getHeight() - 80) {
    doc.addPage();
    yPos = 20;
  }

  // Job cost breakdown
  doc.setFontSize(14);
  doc.text('Job Cost Analysis', 15, yPos);
  yPos += 8;

  const jobCostData = report.jobCosts.map((job) => [
    job.jobTitle,
    job.totalHours.toFixed(2),
    `$${job.totalLaborCost.toFixed(2)}`,
    job.employeeCount.toString(),
    job.totalHours > 0 ? `$${(job.totalLaborCost / job.totalHours).toFixed(2)}` : '-',
  ]);

  // Add total row
  const avgCostPerHour =
    report.summary.totalHours > 0
      ? (report.summary.totalPay / report.summary.totalHours).toFixed(2)
      : '0.00';
  jobCostData.push([
    'TOTAL',
    report.summary.totalHours.toFixed(2),
    `$${report.summary.totalPay.toFixed(2)}`,
    report.summary.employeeCount.toString(),
    `$${avgCostPerHour}`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Job', 'Hours', 'Labor Cost', 'Employees', 'Avg $/Hr']],
    body: jobCostData,
    theme: 'grid',
    headStyles: { fillColor: [66, 66, 66] },
    margin: { left: 15, right: 15 },
    tableWidth: pageWidth - 30,
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'right' },
    },
    didParseCell: function (data) {
      // Make total row bold
      if (data.row.index === jobCostData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      pageWidth - 15,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }

  return doc;
}

/**
 * Download payroll report as PDF
 */
export async function downloadPayrollPDF(report: PayrollReport, companyInfo: CompanyInfo) {
  const doc = await generatePayrollPDF(report, companyInfo);

  const startDate = report.dateRange.startDate.toISOString().split('T')[0];
  const endDate = report.dateRange.endDate.toISOString().split('T')[0];
  const filename = `payroll-report-${startDate}-to-${endDate}.pdf`;

  doc.save(filename);
}

/**
 * Print payroll report PDF
 */
export async function printPayrollPDF(report: PayrollReport, companyInfo: CompanyInfo) {
  const doc = await generatePayrollPDF(report, companyInfo);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}
