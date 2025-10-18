import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { DollarSign, Edit } from 'lucide-react';
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
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useUpdateInvoice, type Invoice } from '../../hooks/useInvoices';
import { useJobs } from '../../hooks/useJobs';
import { toast } from 'sonner';

interface EditInvoiceDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditInvoiceDialog({ invoice, open, onOpenChange }: EditInvoiceDialogProps) {
  const [jobId, setJobId] = useState<string>('');
  const [subtotal, setSubtotal] = useState<string>('0');
  const [taxRate, setTaxRate] = useState<string>('8.5');

  const updateInvoice = useUpdateInvoice();
  const { data: jobs = [] } = useJobs();

  interface InvoiceFormData {
    client: string;
    clientEmail?: string;
    dueDate: string;
    notes?: string;
    jobId?: string;
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<InvoiceFormData>();

  // Pre-populate form when invoice changes
  useEffect(() => {
    if (invoice) {
      setValue('client', invoice.client);
      setValue('clientEmail', invoice.clientEmail || '');
      setValue('dueDate', invoice.dueDate);
      setValue('notes', invoice.notes || '');
      setJobId(invoice.jobId || '');
      setSubtotal(invoice.subtotal.toString());
      setTaxRate(invoice.taxRate.toString());
    }
  }, [invoice, setValue]);

  // Calculate tax and total
  const subtotalNum = parseFloat(subtotal.replace(/[^0-9.-]/g, '')) || 0;
  const taxRateNum = parseFloat(taxRate.replace(/[^0-9.-]/g, '')) || 0;
  const taxAmount = subtotalNum * (taxRateNum / 100);
  const total = subtotalNum + taxAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const onSubmit = async (data: InvoiceFormData) => {
    if (!invoice) return;

    try {
      const subtotalNum = parseFloat(subtotal.replace(/[^0-9.-]/g, ''));
      const taxRateNum = parseFloat(taxRate.replace(/[^0-9.-]/g, ''));

      // Validate required fields
      if (!data.client || data.client.trim().length < 2) {
        toast.error('Client name must be at least 2 characters');
        return;
      }

      if (!data.dueDate) {
        toast.error('Due date is required');
        return;
      }

      // Validate numbers
      if (isNaN(subtotalNum) || subtotalNum <= 0) {
        toast.error('Subtotal must be greater than 0');
        return;
      }

      // Build update data
      const updateData: Record<string, unknown> = {
        client: data.client.trim(),
        dueDate: data.dueDate,
        subtotal: subtotalNum,
        taxRate: taxRateNum,
      };

      // Only update optional fields if they have values
      if (data.clientEmail?.trim()) {
        updateData.clientEmail = data.clientEmail.trim();
      } else {
        updateData.clientEmail = '';
      }

      if (data.notes?.trim()) {
        updateData.notes = data.notes.trim();
      } else {
        updateData.notes = '';
      }

      if (jobId && jobId !== 'none') {
        updateData.jobId = jobId;
      } else {
        updateData.jobId = '';
      }

      await updateInvoice.mutateAsync({ id: invoice.id, data: updateData });
      toast.success('Invoice updated successfully');
      onOpenChange(false);
    } catch (err) {
      console.error('Error updating invoice:', err);
      const message = err instanceof Error ? err.message : 'Failed to update invoice';
      toast.error(message);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="size-5" />
            Edit Invoice {invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Update invoice details. Invoice will remain in draft status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Error Alert */}
          {updateInvoice.isError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to update invoice. Please try again.</AlertDescription>
            </Alert>
          )}

          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="client" required>
              Client Name
            </Label>
            <Input
              id="client"
              placeholder="John Doe / ABC Company"
              error={!!errors.client}
              disabled={updateInvoice.isPending}
              required
              minLength={2}
              {...register('client', { required: true, minLength: 2 })}
            />
            {errors.client && <p className="text-sm text-destructive">{errors.client.message}</p>}
          </div>

          {/* Client Email */}
          <div className="space-y-2">
            <Label htmlFor="clientEmail">
              Client Email <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="clientEmail"
              type="email"
              placeholder="client@example.com"
              error={!!errors.clientEmail}
              disabled={updateInvoice.isPending}
              {...register('clientEmail')}
            />
            {errors.clientEmail && (
              <p className="text-sm text-destructive">{errors.clientEmail.message}</p>
            )}
          </div>

          {/* Link to Job (optional) */}
          <div className="space-y-2">
            <Label htmlFor="jobId">
              Link to Job <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Select
              value={jobId || 'none'}
              onValueChange={(value) => {
                setJobId(value === 'none' ? '' : value);
                setValue('jobId', value === 'none' ? '' : value);
              }}
              disabled={updateInvoice.isPending}
            >
              <SelectTrigger id="jobId">
                <SelectValue placeholder="Select a job (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Associate this invoice with a specific job
            </p>
          </div>

          {/* Amounts Section */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            {/* Subtotal */}
            <div className="space-y-2">
              <Label htmlFor="subtotal" required>
                Subtotal (before tax)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="subtotal"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={subtotal}
                  onChange={(e) => setSubtotal(e.target.value)}
                  error={!!errors.subtotal}
                  disabled={updateInvoice.isPending}
                  required
                />
              </div>
              {errors.subtotal && (
                <p className="text-sm text-destructive">{errors.subtotal.message}</p>
              )}
            </div>

            {/* Tax Rate */}
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                placeholder="8.5"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                error={!!errors.taxRate}
                disabled={updateInvoice.isPending}
              />
              {errors.taxRate && (
                <p className="text-sm text-destructive">{errors.taxRate.message}</p>
              )}
            </div>

            {/* Summary */}
            <div className="pt-2 border-t space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(subtotalNum)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({taxRateNum}%):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1 border-t">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" required>
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              error={!!errors.dueDate}
              disabled={updateInvoice.isPending}
              required
              {...register('dueDate', { required: true })}
            />
            {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Additional details, terms, or payment instructions..."
              rows={3}
              disabled={updateInvoice.isPending}
              {...register('notes')}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateInvoice.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateInvoice.isPending || subtotalNum <= 0}
              loading={updateInvoice.isPending}
              loadingText="Updating invoice..."
            >
              Update Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
