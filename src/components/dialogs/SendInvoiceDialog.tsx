import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { useSendInvoice, type Invoice } from '../../hooks/useInvoices';

interface SendInvoiceDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendInvoiceDialog({
  invoice,
  open,
  onOpenChange,
}: SendInvoiceDialogProps) {
  const [success, setSuccess] = useState(false);
  const sendInvoice = useSendInvoice();

  const handleSend = async () => {
    if (!invoice) return;

    try {
      await sendInvoice.mutateAsync(invoice.id);
      setSuccess(true);

      // Close dialog after 1.5 seconds
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to send invoice:', err);
    }
  };

  const handleClose = () => {
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
            <h3 className="text-xl font-semibold mb-2">Invoice Sent!</h3>
            <p className="text-muted-foreground">
              Invoice {invoice.invoiceNumber} has been marked as sent.
            </p>
          </div>
        ) : (
          /* Confirmation State */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="size-5" />
                Send Invoice
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to send this invoice to the client?
              </DialogDescription>
            </DialogHeader>

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
              {invoice.clientEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm">{invoice.clientEmail}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="text-lg font-bold">
                  {formatCurrency(invoice.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Due Date:</span>
                <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Error Alert */}
            {sendInvoice.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to send invoice. Please try again.
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground">
              This will mark the invoice as <span className="font-semibold">Sent</span> and set the sent date to today.
            </div>

            {/* Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={sendInvoice.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSend}
                disabled={sendInvoice.isPending}
                loading={sendInvoice.isPending}
                loadingText="Sending..."
              >
                <Send className="size-4 mr-2" />
                Send Invoice
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
