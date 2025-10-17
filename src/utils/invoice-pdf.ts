/**
 * Invoice PDF Generation Utility
 *
 * Generates professional PDF invoices using jsPDF
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice, PaymentRecord } from '../hooks/useInvoices';
import type { CompanyInfo } from '../types/invoice';
import { format } from 'date-fns';

// Re-export for backward compatibility
export type { CompanyInfo };

/**
 * Generate a PDF invoice
 */
export async function generateInvoicePDF(
  invoice: Invoice,
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

  // Invoice Title
  yPos += 10;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 15, yPos);

  // Invoice Details
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoiceNumber, 55, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(invoice.date), 'MMMM dd, yyyy'), 55, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Due Date:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  const dueDate = format(new Date(invoice.dueDate), 'MMMM dd, yyyy');
  doc.text(dueDate, 55, yPos);

  // Status Badge
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  const statusColor = getStatusColor(invoice.status);
  doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
  doc.text(invoice.status.toUpperCase(), 55, yPos);
  doc.setTextColor(0, 0, 0);

  // Bill To Section
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 15, yPos);

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.client, 15, yPos);

  if (invoice.clientEmail) {
    yPos += 5;
    doc.text(invoice.clientEmail, 15, yPos);
  }

  // Items Table
  yPos += 15;

  // Create line items (currently just subtotal, could be expanded)
  const lineItems = [
    {
      description: 'Services Rendered',
      amount: invoice.subtotal.toFixed(2),
    },
  ];

  // If there's a job reference, add it
  if (invoice.jobId) {
    lineItems[0].description += ` (Job #${invoice.jobId})`;
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: lineItems.map((item) => [item.description, `$${item.amount}`]),
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
      0: { cellWidth: 130 },
      1: { cellWidth: 45, halign: 'right' },
    },
  });

  // Get the Y position after the table
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Summary Section
  const summaryX = pageWidth - 70;
  doc.setFontSize(10);

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', summaryX, yPos);
  doc.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - 15, yPos, {
    align: 'right',
  });

  // Tax
  yPos += 6;
  doc.text(`Tax (${invoice.taxRate}%):`, summaryX, yPos);
  doc.text(`$${invoice.tax.toFixed(2)}`, pageWidth - 15, yPos, {
    align: 'right',
  });

  // Total
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', summaryX, yPos);
  doc.text(`$${invoice.amount.toFixed(2)}`, pageWidth - 15, yPos, {
    align: 'right',
  });

  // Amount Paid
  if (invoice.amountPaid > 0) {
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Amount Paid:', summaryX, yPos);
    doc.text(`$${invoice.amountPaid.toFixed(2)}`, pageWidth - 15, yPos, {
      align: 'right',
    });

    // Remaining Balance
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due:', summaryX, yPos);
    doc.setTextColor(220, 53, 69); // Red for balance due
    doc.text(`$${invoice.remainingBalance.toFixed(2)}`, pageWidth - 15, yPos, {
      align: 'right',
    });
    doc.setTextColor(0, 0, 0);
  }

  // Payment History (if exists)
  if (invoice.payments && invoice.payments.length > 0) {
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT HISTORY', 15, yPos);

    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Method', 'Reference', 'Amount']],
      body: invoice.payments.map((payment: PaymentRecord) => [
        format(new Date(payment.paidDate), 'MM/dd/yyyy'),
        payment.paymentMethod.replace('_', ' ').toUpperCase(),
        payment.reference || '-',
        `$${payment.amount.toFixed(2)}`,
      ]),
      theme: 'plain',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: 0,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
      },
      columnStyles: {
        3: { halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Notes Section
  if (invoice.notes) {
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 15, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 30);
    doc.text(splitNotes, 15, yPos);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Thank you for your business!',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.setFontSize(7);
  doc.text(
    `Invoice generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
    pageWidth / 2,
    footerY + 5,
    { align: 'center' }
  );

  return doc;
}

/**
 * Download invoice as PDF
 */
export async function downloadInvoicePDF(
  invoice: Invoice,
  companyInfo: CompanyInfo
): Promise<void> {
  const doc = await generateInvoicePDF(invoice, companyInfo);
  const filename = `Invoice-${invoice.invoiceNumber}.pdf`;
  doc.save(filename);
}

/**
 * Print invoice PDF
 */
export async function printInvoicePDF(
  invoice: Invoice,
  companyInfo: CompanyInfo
): Promise<void> {
  const doc = await generateInvoicePDF(invoice, companyInfo);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}

/**
 * Get color for invoice status
 */
function getStatusColor(status: string): { r: number; g: number; b: number } {
  switch (status.toLowerCase()) {
    case 'paid':
      return { r: 40, g: 167, b: 69 }; // Green
    case 'sent':
      return { r: 0, g: 123, b: 255 }; // Blue
    case 'overdue':
      return { r: 220, g: 53, b: 69 }; // Red
    case 'cancelled':
      return { r: 108, g: 117, b: 125 }; // Gray
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
