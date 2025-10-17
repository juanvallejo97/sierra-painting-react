import { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { useCancelInvoice, type Invoice } from '../../hooks/useInvoices';

interface CancelInvoiceDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelInvoiceDialog({
  invoice,
  open,
  onOpenChange,
}: CancelInvoiceDialogProps) {
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(false);
  const cancelInvoice = useCancelInvoice();

  const handleCancel = async () => {
    if (!invoice) return;

    try {
      await cancelInvoice.mutateAsync({
        invoiceId: invoice.id,
        reason: reason.trim() || undefined,
      });

      setSuccess(true);

      // Close dialog after 1.5 seconds
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to cancel invoice:', err);
    }
  };

  const handleClose = () => {
    setReason('');
    setSuccess(false);
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (!invoice) return null;

  const hasPartialPayment = invoice.amountPaid > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {success ? (
          /* Success State */
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="size-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="size-8 text-success" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Invoice Cancelled</h3>
            <p className="text-muted-foreground">
              Invoice {invoice.invoiceNumber} has been cancelled.
            </p>
          </div>
        ) : (
          /* Confirmation State */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <X className="size-5" />
                Cancel Invoice
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this invoice? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {/* Warning for partial payments */}
            {hasPartialPayment && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  This invoice has partial payments totaling {formatCurrency(invoice.amountPaid)}.
                  Cancelling will not refund these payments. Please handle refunds separately if needed.
                </AlertDescription>
              </Alert>
            )}

            {/* Invoice Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Invoice:</span>
                <span className="font-medium font-mono">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Client:</span>
                <span className="font-medium">{invoice.client}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="font-semibold">
                  {formatCurrency(invoice.amount)}
                </span>
              </div>
              {hasPartialPayment && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Paid:</span>
                    <span className="text-sm text-success">
                      {formatCurrency(invoice.amountPaid)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Remaining:</span>
                    <span className="text-sm">
                      {formatCurrency(invoice.remainingBalance)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className="text-sm capitalize">{invoice.status.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Cancellation Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Cancellation Reason <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="reason"
                placeholder="Why is this invoice being cancelled?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={cancelInvoice.isPending}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                This will be added to the invoice notes
              </p>
            </div>

            {/* Error Alert */}
            {cancelInvoice.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to cancel invoice. Please try again.
                </AlertDescription>
              </Alert>
            )}

            {/* Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={cancelInvoice.isPending}
              >
                Keep Invoice
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelInvoice.isPending}
                loading={cancelInvoice.isPending}
                loadingText="Cancelling..."
              >
                <X className="size-4 mr-2" />
                Cancel Invoice
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
