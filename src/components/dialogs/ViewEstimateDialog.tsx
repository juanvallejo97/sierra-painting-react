/**
 * View Estimate Dialog
 *
 * Displays complete estimate details with option to convert to invoice
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  X,
  FileText,
  Calendar,
  User,
  Mail,
  DollarSign,
  Receipt,
  Download,
  Printer,
} from 'lucide-react';
import type { Estimate, EstimateStatus } from '../../hooks/useEstimates';
import { format } from 'date-fns';
import { downloadEstimatePDF, printEstimatePDF, getDefaultCompanyInfo } from '../../utils/estimate-pdf';
import { toast } from 'sonner';
import { useCompany, companyToCompanyInfo } from '../../hooks/useCompany';

interface ViewEstimateDialogProps {
  estimate: Estimate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvertToInvoice?: (estimateId: string) => void;
}

export function ViewEstimateDialog({
  estimate,
  open,
  onOpenChange,
  onConvertToInvoice,
}: ViewEstimateDialogProps) {
  const { data: company } = useCompany();

  if (!estimate) return null;

  const handleDownloadPDF = async () => {
    try {
      const companyInfo = company ? companyToCompanyInfo(company) : getDefaultCompanyInfo();
      await downloadEstimatePDF(estimate, companyInfo);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handlePrintPDF = async () => {
    try {
      const companyInfo = company ? companyToCompanyInfo(company) : getDefaultCompanyInfo();
      await printEstimatePDF(estimate, companyInfo);
    } catch (error) {
      console.error('Failed to print PDF:', error);
      toast.error('Failed to print PDF');
    }
  };

  const getStatusVariant = (status: EstimateStatus) => {
    switch (status) {
      case 'approved':
        return 'default' as const;
      case 'sent':
        return 'secondary' as const;
      case 'draft':
        return 'outline' as const;
      case 'rejected':
        return 'destructive' as const;
      case 'expired':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const formatStatus = (status: EstimateStatus) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const canConvertToInvoice = estimate.status === 'approved' && !estimate.invoiceId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl">
                Estimate {estimate.estimateNumber}
              </DialogTitle>
              <DialogDescription>
                Complete estimate details and line items
              </DialogDescription>
            </div>
            <Badge variant={getStatusVariant(estimate.status)} className="ml-2">
              {formatStatus(estimate.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estimate Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Estimate Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(estimate.date), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {estimate.expiryDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Expiry Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(estimate.expiryDate), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {estimate.sentDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Sent Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(estimate.sentDate), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {estimate.approvedDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Approved Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(estimate.approvedDate), 'MMMM dd, yyyy')}
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
                  <p className="text-sm text-muted-foreground">{estimate.client}</p>
                </div>
              </div>

              {estimate.clientEmail && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {estimate.clientEmail}
                    </p>
                  </div>
                </div>
              )}

              {estimate.invoiceId && (
                <div className="flex items-start gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Converted to Invoice</p>
                    <p className="text-sm text-blue-600">
                      {estimate.invoiceId}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          {estimate.lineItems && estimate.lineItems.length > 0 && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Line Items</h3>
                <div className="border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Description</th>
                        <th className="text-right p-3 text-sm font-medium w-20">Qty</th>
                        <th className="text-right p-3 text-sm font-medium w-28">Rate</th>
                        <th className="text-right p-3 text-sm font-medium w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimate.lineItems.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3 text-sm">{item.description}</td>
                          <td className="p-3 text-sm text-right">{item.quantity}</td>
                          <td className="p-3 text-sm text-right">${item.rate.toFixed(2)}</td>
                          <td className="p-3 text-sm text-right font-medium">
                            ${item.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Amount Details */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Amount Details
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${estimate.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({estimate.taxRate}%)</span>
                <span>${estimate.tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Amount</span>
                <span>${estimate.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {estimate.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {estimate.description}
                </p>
              </div>
            </>
          )}

          {/* Notes */}
          {estimate.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Internal Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {estimate.notes}
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={handlePrintPDF}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
              {canConvertToInvoice && onConvertToInvoice && (
                <Button
                  onClick={() => {
                    onConvertToInvoice(estimate.id);
                    onOpenChange(false);
                  }}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Convert to Invoice
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
