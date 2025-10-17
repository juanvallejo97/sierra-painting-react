/**
 * Estimate PDF Generation Utility
 *
 * Generates professional PDF estimates using jsPDF
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Estimate } from '../hooks/useEstimates';
import type { CompanyInfo } from '../types/invoice';
import { format } from 'date-fns';

/**
 * Generate a PDF estimate
 */
export async function generateEstimatePDF(
  estimate: Estimate,
  companyInfo: CompanyInfo
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Company Logo (if available)
  if (companyInfo.logo) {
    try {
      doc.addImage(companyInfo.logo, 'JPEG', 15, yPos, 40, 20);
    } catch (error) {
      console.warn('Failed to add logo:', error);
    }
  }

  // Company Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name, pageWidth - 15, yPos, { align: 'right' });

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (companyInfo.address) {
    doc.text(companyInfo.address, pageWidth - 15, yPos, { align: 'right' });
    yPos += 5;
  }
  if (companyInfo.phone) {
    doc.text(companyInfo.phone, pageWidth - 15, yPos, { align: 'right' });
    yPos += 5;
  }
  if (companyInfo.email) {
    doc.text(companyInfo.email, pageWidth - 15, yPos, { align: 'right' });
    yPos += 5;
  }

  // Estimate Title
  yPos += 10;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTIMATE', 15, yPos);

  // Estimate Details
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Estimate Number:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(estimate.estimateNumber, 55, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Estimate Date:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(estimate.date), 'MMMM dd, yyyy'), 55, yPos);

  if (estimate.expiryDate) {
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Valid Until:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    const expiryDate = format(new Date(estimate.expiryDate), 'MMMM dd, yyyy');
    doc.text(expiryDate, 55, yPos);
  }

  // Status Badge
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  const statusColor = getStatusColor(estimate.status);
  doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
  doc.text(estimate.status.toUpperCase(), 55, yPos);
  doc.setTextColor(0, 0, 0);

  // Client Section
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED FOR:', 15, yPos);

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(estimate.client, 15, yPos);

  if (estimate.clientEmail) {
    yPos += 5;
    doc.text(estimate.clientEmail, 15, yPos);
  }

  // Description (if exists)
  if (estimate.description) {
    yPos += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT DESCRIPTION:', 15, yPos);

    yPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitDescription = doc.splitTextToSize(estimate.description, pageWidth - 30);
    doc.text(splitDescription, 15, yPos);
    yPos += splitDescription.length * 5 + 5;
  }

  // Line Items Table
  yPos += 10;

  if (estimate.lineItems && estimate.lineItems.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Qty', 'Rate', 'Amount']],
      body: estimate.lineItems.map((item) => [
        item.description,
        item.quantity.toString(),
        `$${item.rate.toFixed(2)}`,
        `$${item.amount.toFixed(2)}`,
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 10,
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
    });

    // Get the Y position after the table
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Summary Section
  const summaryX = pageWidth - 70;
  doc.setFontSize(10);

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', summaryX, yPos);
  doc.text(`$${estimate.subtotal.toFixed(2)}`, pageWidth - 15, yPos, {
    align: 'right',
  });

  // Tax
  yPos += 6;
  doc.text(`Tax (${estimate.taxRate}%):`, summaryX, yPos);
  doc.text(`$${estimate.tax.toFixed(2)}`, pageWidth - 15, yPos, {
    align: 'right',
  });

  // Total
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total Estimate:', summaryX, yPos);
  doc.text(`$${estimate.amount.toFixed(2)}`, pageWidth - 15, yPos, {
    align: 'right',
  });

  // Notes Section
  if (estimate.notes) {
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 15, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(estimate.notes, pageWidth - 30);
    doc.text(splitNotes, 15, yPos);
  }

  // Approval Section
  yPos += 20;
  if (yPos > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT APPROVAL:', 15, yPos);

  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.line(15, yPos, 90, yPos); // Signature line
  doc.text('Signature', 15, yPos + 5);

  doc.line(110, yPos, 185, yPos); // Date line
  doc.text('Date', 110, yPos + 5);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'This estimate is valid for 30 days from the date above.',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.setFontSize(7);
  doc.text(
    `Estimate generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
    pageWidth / 2,
    footerY + 5,
    { align: 'center' }
  );

  return doc;
}

/**
 * Download estimate as PDF
 */
export async function downloadEstimatePDF(
  estimate: Estimate,
  companyInfo: CompanyInfo
): Promise<void> {
  const doc = await generateEstimatePDF(estimate, companyInfo);
  const filename = `Estimate-${estimate.estimateNumber}.pdf`;
  doc.save(filename);
}

/**
 * Print estimate PDF
 */
export async function printEstimatePDF(
  estimate: Estimate,
  companyInfo: CompanyInfo
): Promise<void> {
  const doc = await generateEstimatePDF(estimate, companyInfo);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}

/**
 * Get color for estimate status
 */
function getStatusColor(status: string): { r: number; g: number; b: number } {
  switch (status.toLowerCase()) {
    case 'approved':
      return { r: 40, g: 167, b: 69 }; // Green
    case 'sent':
      return { r: 0, g: 123, b: 255 }; // Blue
    case 'rejected':
      return { r: 220, g: 53, b: 69 }; // Red
    case 'expired':
      return { r: 220, g: 53, b: 69 }; // Red
    case 'draft':
    default:
      return { r: 255, g: 193, b: 7 }; // Yellow
  }
}

/**
 * Get default company info from environment or settings
 */
export function getDefaultCompanyInfo(): CompanyInfo {
  return {
    name: 'Sierra Painting',
    address: '123 Main St, City, State 12345',
    phone: '(555) 123-4567',
    email: 'contact@sierrapainting.com',
    website: 'www.sierrapainting.com',
  };
}
