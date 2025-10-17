import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, DollarSign } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useCreateInvoice } from '../../hooks/useInvoices';
import { useJobs } from '../../hooks/useJobs';
import {
  createInvoiceSchema,
  type CreateInvoiceFormData,
} from '../../schemas/invoice.schema';

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
}: CreateInvoiceDialogProps) {
  const [jobId, setJobId] = useState<string>('');
  const [subtotal, setSubtotal] = useState<string>('0');
  const [taxRate, setTaxRate] = useState<string>('8.5');

  const createInvoice = useCreateInvoice();
  const { data: jobs = [] } = useJobs();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<any>({
    // Don't use zodResolver since subtotal/taxRate are managed by local state
    // resolver: zodResolver(createInvoiceSchema) as any,
    defaultValues: {
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 30 days from now
    },
  });

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

  const onSubmit = async (data: any) => {
    try {
      const subtotalNum = parseFloat(subtotal.replace(/[^0-9.-]/g, ''));
      const taxRateNum = parseFloat(taxRate.replace(/[^0-9.-]/g, ''));

      // Validate required fields
      if (!data.client || data.client.trim().length < 2) {
        console.error('Client name is required');
        return;
      }

      if (!data.dueDate) {
        console.error('Due date is required');
        return;
      }

      // Validate numbers
      if (isNaN(subtotalNum) || subtotalNum <= 0) {
        console.error('Invalid subtotal');
        return;
      }

      // Build invoice data, filtering out undefined optional fields
      const invoiceData: any = {
        client: data.client.trim(),
        dueDate: data.dueDate,
        subtotal: subtotalNum,
        taxRate: taxRateNum,
      };

      // Only add optional fields if they have values
      if (data.clientEmail?.trim()) {
        invoiceData.clientEmail = data.clientEmail.trim();
      }
      if (data.notes?.trim()) {
        invoiceData.notes = data.notes.trim();
      }
      if (jobId && jobId !== 'none') {
        invoiceData.jobId = jobId;
      }

      await createInvoice.mutateAsync(invoiceData);

      reset();
      setJobId('');
      setSubtotal('0');
      setTaxRate('8.5');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create invoice:', err);
    }
  };

  const handleClose = () => {
    reset();
    setJobId('');
    setSubtotal('0');
    setTaxRate('8.5');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Create New Invoice
          </DialogTitle>
          <DialogDescription>
            Create a draft invoice for a client. You can send it later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          {/* Error Alert */}
          {createInvoice.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to create invoice. Please try again.
              </AlertDescription>
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
              disabled={createInvoice.isPending}
              required
              minLength={2}
              {...register('client', { required: true, minLength: 2 })}
            />
            {errors.client && (
              <p className="text-sm text-destructive">{errors.client.message}</p>
            )}
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
              disabled={createInvoice.isPending}
              {...register('clientEmail')}
            />
            {errors.clientEmail && (
              <p className="text-sm text-destructive">
                {errors.clientEmail.message}
              </p>
            )}
          </div>

          {/* Link to Job (optional) */}
          <div className="space-y-2">
            <Label htmlFor="jobId">
              Link to Job <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Select
              value={jobId}
              onValueChange={(value) => {
                setJobId(value === 'none' ? '' : value);
                setValue('jobId', value === 'none' ? '' : value);
              }}
              disabled={createInvoice.isPending}
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
                  disabled={createInvoice.isPending}
                  required
                />
              </div>
              {errors.subtotal && (
                <p className="text-sm text-destructive">
                  {errors.subtotal.message}
                </p>
              )}
            </div>

            {/* Tax Rate */}
            <div className="space-y-2">
              <Label htmlFor="taxRate">
                Tax Rate (%)
              </Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                placeholder="8.5"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                error={!!errors.taxRate}
                disabled={createInvoice.isPending}
              />
              {errors.taxRate && (
                <p className="text-sm text-destructive">
                  {errors.taxRate.message}
                </p>
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
              disabled={createInvoice.isPending}
              required
              {...register('dueDate', { required: true })}
            />
            {errors.dueDate && (
              <p className="text-sm text-destructive">{errors.dueDate.message}</p>
            )}
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
              disabled={createInvoice.isPending}
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createInvoice.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createInvoice.isPending || subtotalNum <= 0}
              loading={createInvoice.isPending}
              loadingText="Creating invoice..."
            >
              Create Draft Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
