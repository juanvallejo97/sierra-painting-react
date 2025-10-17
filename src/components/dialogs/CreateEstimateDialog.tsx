/**
 * Create Estimate Dialog
 *
 * Simplified estimate creation - creates basic estimate with client and amount
 * Future enhancement: Add line items editor for detailed breakdowns
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useCreateEstimate, type EstimateLineItem } from '../../hooks/useEstimates';
import { Loader2 } from 'lucide-react';

const estimateSchema = z.object({
  client: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Valid email required').optional().or(z.literal('')),
  amount: z.string().min(1, 'Amount is required'),
  taxRate: z.string().min(0, 'Tax rate is required'),
  expiryDate: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type EstimateFormData = z.infer<typeof estimateSchema>;

interface CreateEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEstimateDialog({
  open,
  onOpenChange,
}: CreateEstimateDialogProps) {
  const createEstimate = useCreateEstimate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EstimateFormData>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      taxRate: '8.5', // Default tax rate
    },
  });

  const onSubmit = async (data: EstimateFormData) => {
    try {
      setIsSubmitting(true);

      const amount = parseFloat(data.amount);
      const taxRate = parseFloat(data.taxRate || '0');

      // Calculate subtotal from total amount
      const subtotal = amount / (1 + taxRate / 100);

      // Create a single line item for the total
      const lineItems: EstimateLineItem[] = [
        {
          description: data.description || 'Painting Services',
          quantity: 1,
          rate: subtotal,
          amount: subtotal,
        },
      ];

      // Set default expiry date to 30 days from now
      const defaultExpiryDate = new Date();
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30);
      const expiryDate = data.expiryDate || defaultExpiryDate.toISOString().split('T')[0];

      await createEstimate.mutateAsync({
        client: data.client,
        clientEmail: data.clientEmail || undefined,
        taxRate,
        expiryDate,
        description: data.description,
        lineItems,
        notes: data.notes,
      });

      toast.success('Estimate created successfully');
      reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to create estimate:', error);
      toast.error(error.message || 'Failed to create estimate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Estimate</DialogTitle>
          <DialogDescription>
            Create a new project estimate for a client
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/*
            PHASE 6 - AI ASSISTANT INTEGRATION POINT

            Future enhancement: Add AI-powered estimate builder here:
            - Document upload button (PDF/Word/Images)
            - "AI Assist" toggle button
            - Contract analyzer with real-time extraction
            - Suggested line items from AI analysis
            - Government compliance checker
            - Template selector (Standard vs Government Contract)

            When AI is enabled:
            1. Show document upload zone
            2. Parse uploaded contract documents
            3. Extract: scope, materials, labor, timeline
            4. Auto-populate form fields below
            5. Generate line items with pricing
            6. Show confidence scores and suggestions
          */}

          {/* Client Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client Name *</Label>
              <Input
                id="client"
                {...register('client')}
                placeholder="John Doe"
              />
              {errors.client && (
                <p className="text-sm text-destructive">{errors.client.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email</Label>
              <Input
                id="clientEmail"
                type="email"
                {...register('clientEmail')}
                placeholder="john@example.com"
              />
              {errors.clientEmail && (
                <p className="text-sm text-destructive">{errors.clientEmail.message}</p>
              )}
            </div>
          </div>

          {/* Amount and Tax */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="amount">Total Amount (including tax) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount')}
                placeholder="1500.00"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                {...register('taxRate')}
                placeholder="8.5"
              />
              {errors.taxRate && (
                <p className="text-sm text-destructive">{errors.taxRate.message}</p>
              )}
            </div>
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input
              id="expiryDate"
              type="date"
              {...register('expiryDate')}
            />
            <p className="text-xs text-muted-foreground">
              Defaults to 30 days from now if not specified
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of the work..."
              rows={3}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Internal)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Internal notes about this estimate..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Estimate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
