import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DollarSign, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useRecordPayment, type Invoice, type RecordPaymentData } from '../../hooks/useInvoices';
import { z } from 'zod';

const partialPaymentSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .or(
      z.string().transform((val) => {
        const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
        if (isNaN(num)) throw new Error('Invalid number');
        return num;
      })
    ),
  paidDate: z
    .string()
    .min(1, 'Payment date is required')
    .refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), 'Invalid date format')
    .refine((date) => {
      const paymentDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return paymentDate <= today;
    }, 'Payment date cannot be in the future'),
  paymentMethod: z.enum(['cash', 'check', 'credit', 'bank_transfer', 'other']).default('cash'),
  reference: z
    .string()
    .max(100, 'Reference must be less than 100 characters')
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
});

type PartialPaymentFormData = z.infer<typeof partialPaymentSchema>;

interface PartialPaymentDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PartialPaymentDialog({
  invoice,
  open,
  onOpenChange,
}: PartialPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [success, setSuccess] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const recordPayment = useRecordPayment();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PartialPaymentFormData>({
    resolver: zodResolver(partialPaymentSchema),
    defaultValues: {
      paidDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
    },
  });

  const onSubmit = async (data: PartialPaymentFormData) => {
    if (!invoice) return;

    const paymentAmount = typeof data.amount === 'string'
      ? parseFloat(data.amount.replace(/[^0-9.-]/g, ''))
      : data.amount;

    // Validate against remaining balance
    if (paymentAmount > invoice.remainingBalance + 0.01) {
      return;
    }

    try {
      await recordPayment.mutateAsync({
        invoiceId: invoice.id,
        payment: {
          amount: paymentAmount,
          paidDate: data.paidDate,
          paymentMethod: data.paymentMethod,
          reference: data.reference,
          notes: data.notes,
        } as RecordPaymentData,
      });

      setSuccess(true);

      // Close dialog after 1.5 seconds
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
  };

  const handleClose = () => {
    reset();
    setPaymentMethod('cash');
    setAmount('');
    setSuccess(false);
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate values for display
  const paymentAmount = amount ? parseFloat(amount.replace(/[^0-9.-]/g, '')) || 0 : 0;
  const newRemainingBalance = invoice ? invoice.remainingBalance - paymentAmount : 0;
  const isFullPayment = invoice && Math.abs(newRemainingBalance) < 0.01;
  const exceedsBalance = invoice && paymentAmount > invoice.remainingBalance + 0.01;

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
            <h3 className="text-xl font-semibold mb-2">Payment Recorded!</h3>
            <p className="text-muted-foreground">
              {isFullPayment
                ? `Invoice ${invoice.invoiceNumber} has been marked as paid.`
                : `Partial payment recorded for invoice ${invoice.invoiceNumber}.`}
            </p>
          </div>
        ) : (
          /* Form State */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="size-5" />
                Record Payment
              </DialogTitle>
              <DialogDescription>
                Record a payment for invoice {invoice.invoiceNumber} - {invoice.client}
              </DialogDescription>
            </DialogHeader>

            {/* Invoice Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Invoice Total:</span>
                <span className="font-semibold">
                  {formatCurrency(invoice.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Paid to Date:</span>
                <span className="text-sm">
                  {formatCurrency(invoice.amountPaid)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm font-medium">Remaining Balance:</span>
                <span className="text-lg font-bold text-orange-600">
                  {formatCurrency(invoice.remainingBalance)}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Error Alert */}
              {recordPayment.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Failed to record payment. Please try again.
                  </AlertDescription>
                </Alert>
              )}

              {/* Payment Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount" required>
                  Payment Amount
                </Label>
                <Input
                  id="amount"
                  type="text"
                  placeholder="0.00"
                  error={!!errors.amount || exceedsBalance}
                  disabled={recordPayment.isPending}
                  {...register('amount')}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setValue('amount', e.target.value as any);
                  }}
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
                {exceedsBalance && (
                  <p className="text-sm text-destructive">
                    Payment amount exceeds remaining balance
                  </p>
                )}
                {paymentAmount > 0 && !exceedsBalance && (
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      New remaining balance:{' '}
                      <span className={newRemainingBalance > 0.01 ? 'text-orange-600 font-semibold' : 'text-success font-semibold'}>
                        {formatCurrency(newRemainingBalance)}
                      </span>
                    </p>
                    {isFullPayment && (
                      <p className="text-success font-medium">
                        ✓ This will mark the invoice as fully paid
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Date */}
              <div className="space-y-2">
                <Label htmlFor="paidDate" required>
                  Payment Date
                </Label>
                <Input
                  id="paidDate"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  error={!!errors.paidDate}
                  disabled={recordPayment.isPending}
                  {...register('paidDate')}
                />
                {errors.paidDate && (
                  <p className="text-sm text-destructive">
                    {errors.paidDate.message}
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod" required>
                  Payment Method
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => {
                    setPaymentMethod(value);
                    setValue('paymentMethod', value as any);
                  }}
                  disabled={recordPayment.isPending}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reference Number */}
              <div className="space-y-2">
                <Label htmlFor="reference">
                  Reference Number <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="reference"
                  placeholder="Check #, transaction ID, etc."
                  disabled={recordPayment.isPending}
                  {...register('reference')}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">
                  Notes <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="notes"
                  placeholder="Additional notes..."
                  disabled={recordPayment.isPending}
                  {...register('notes')}
                />
              </div>

              {/* Footer */}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={recordPayment.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordPayment.isPending || !paymentAmount || exceedsBalance}
                  loading={recordPayment.isPending}
                  loadingText="Recording payment..."
                >
                  Record Payment
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
