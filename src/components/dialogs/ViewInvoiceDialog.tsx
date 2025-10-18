/**
 * View Invoice Dialog
 *
 * Displays complete invoice details with options to download PDF or print
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Download, Printer, X, FileText, Calendar, User, Mail, Edit } from 'lucide-react';
import type { Invoice } from '../../hooks/useInvoices';
import { format } from 'date-fns';
import {
  downloadInvoicePDF,
  printInvoicePDF,
  getDefaultCompanyInfo,
} from '../../utils/invoice-pdf';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCompany, companyToCompanyInfo } from '../../hooks/useCompany';

interface ViewInvoiceDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function ViewInvoiceDialog({ invoice, open, onOpenChange, onEdit }: ViewInvoiceDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: company } = useCompany();

  if (!invoice) return null;

  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true);
      const companyInfo = company ? companyToCompanyInfo(company) : getDefaultCompanyInfo();
      await downloadInvoicePDF(invoice, companyInfo);
      toast.success('PDF downloaded successfully');
    } catch {
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    try {
      setIsGenerating(true);
      const companyInfo = company ? companyToCompanyInfo(company) : getDefaultCompanyInfo();
      await printInvoicePDF(invoice, companyInfo);
    } catch {
      toast.error('Failed to print invoice. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default' as const;
      case 'sent':
        return 'secondary' as const;
      case 'overdue':
        return 'destructive' as const;
      case 'draft':
        return 'outline' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl">Invoice {invoice.invoiceNumber}</DialogTitle>
              <DialogDescription>Complete invoice details and payment history</DialogDescription>
            </div>
            <Badge variant={getStatusVariant(invoice.status)} className="ml-2">
              {invoice.status.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Invoice Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(invoice.date), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Due Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(invoice.dueDate), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {invoice.sentDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Sent Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(invoice.sentDate), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {invoice.paidDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Paid Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(invoice.paidDate), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Client</p>
                  <p className="text-sm text-muted-foreground">{invoice.client}</p>
                </div>
              </div>

              {invoice.clientEmail && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{invoice.clientEmail}</p>
                  </div>
                </div>
              )}

              {invoice.jobId && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Related Job</p>
                    <p className="text-sm text-muted-foreground">{invoice.jobId}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Amount Details */}
          <div className="space-y-3">
            <h3 className="font-semibold">Amount Details</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({invoice.taxRate}%)</span>
                <span>${invoice.tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Amount</span>
                <span>${invoice.amount.toFixed(2)}</span>
              </div>
              {invoice.amountPaid > 0 && (
                <>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Amount Paid</span>
                    <span>-${invoice.amountPaid.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-destructive">
                    <span>Balance Due</span>
                    <span>${invoice.remainingBalance.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold">Payment History</h3>
                <div className="space-y-2">
                  {invoice.payments.map((payment, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {payment.paymentMethod.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.paidDate), 'MMMM dd, yyyy')}
                          {payment.reference && ` • Ref: ${payment.reference}`}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                        )}
                      </div>
                      <span className="font-semibold text-green-600">
                        +${payment.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {invoice.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              {invoice.status === 'draft' && onEdit && (
                <Button
                  variant="default"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit();
                  }}
                  disabled={isGenerating}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
              <Button variant="outline" onClick={handlePrint} disabled={isGenerating}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownloadPDF} disabled={isGenerating}>
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
