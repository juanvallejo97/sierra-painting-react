import { useState } from 'react';
import { Plus, FileText, Send, CheckCircle, Eye } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DataTable, type Column } from '../components/ui/data-table';
import { EmptyState } from '../components/ui/empty-state';
import { SearchBar } from '../components/ui/search-bar';
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useEstimates, useSendEstimate, useConvertEstimateToInvoice, type Estimate, type EstimateStatus } from '../hooks/useEstimates';
import { CreateEstimateDialog } from '../components/dialogs/CreateEstimateDialog';
import { ViewEstimateDialog } from '../components/dialogs/ViewEstimateDialog';
import { toast } from 'sonner';

/**
 * FUTURE ENHANCEMENT: AI-Powered Estimate Creation
 *
 * Plan: Integrate AI assistant to read and analyze government contract documents
 * and create accurate painting estimates for high-scale projects.
 *
 * Features to implement:
 * - Document upload (PDF/Word/Images) for contract analysis
 * - AI extraction of project scope, materials, labor requirements
 * - Automated calculation of estimates based on government standards
 * - Compliance checking for government contract requirements
 * - Line item generation with pricing breakdowns
 * - Export to government-standard formats
 *
 * Tech stack considerations:
 * - Claude API or similar LLM for document analysis
 * - PDF parsing library (pdf.js, react-pdf)
 * - Document OCR for scanned contracts
 * - Template engine for government estimate formats
 */

export function EstimatesScreen() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | 'all'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Estimate | null>(null);

  const { data: estimates = [], isLoading, error } = useEstimates(
    statusFilter === 'all' ? undefined : statusFilter
  );
  const sendEstimate = useSendEstimate();
  const convertToInvoice = useConvertEstimateToInvoice();

  const handleSendEstimate = async (estimateId: string) => {
    try {
      await sendEstimate.mutateAsync(estimateId);
      toast.success('Estimate sent successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send estimate');
    }
  };

  const handleConvertToInvoice = async (estimateId: string) => {
    try {
      const result = await convertToInvoice.mutateAsync(estimateId);
      toast.success('Estimate converted to invoice successfully');
      // Could navigate to invoice here if desired
      console.log('Created invoice:', result.invoiceId);
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert estimate');
    }
  };

  // Filter estimates by search
  const filteredEstimates = estimates.filter((estimate) => {
    const searchLower = search.toLowerCase();
    return (
      estimate.estimateNumber.toLowerCase().includes(searchLower) ||
      estimate.client.toLowerCase().includes(searchLower) ||
      (estimate.clientEmail && estimate.clientEmail.toLowerCase().includes(searchLower))
    );
  });

  const getStatusColor = (status: EstimateStatus) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'sent':
        return 'secondary';
      case 'draft':
        return 'outline';
      case 'rejected':
        return 'destructive';
      case 'expired':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const columns: Column<Estimate>[] = [
    {
      key: 'estimateNumber',
      header: 'Estimate #',
      sortable: true,
      render: (estimate) => (
        <div>
          <p className="font-medium font-mono text-sm">{estimate.estimateNumber}</p>
          <p className="text-xs text-muted-foreground">{estimate.client}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (estimate) => (
        <p className="font-semibold">{formatCurrency(estimate.amount)}</p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (estimate) => (
        <Badge variant={getStatusColor(estimate.status)}>
          {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (estimate) => (
        <span className="text-sm">
          {new Date(estimate.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Expires',
      sortable: true,
      render: (estimate) => (
        <span className="text-sm text-muted-foreground">
          {estimate.expiryDate
            ? new Date(estimate.expiryDate).toLocaleDateString()
            : 'No expiry'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (estimate) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewTarget(estimate)}
          >
            <Eye className="size-3 mr-1" />
            View
          </Button>
          {estimate.status === 'approved' && !estimate.invoiceId && (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleConvertToInvoice(estimate.id)}
              disabled={convertToInvoice.isPending}
            >
              Convert to Invoice
            </Button>
          )}
          {estimate.status === 'draft' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleSendEstimate(estimate.id)}
              disabled={sendEstimate.isPending}
            >
              <Send className="size-3 mr-1" />
              Send
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Count estimates by status
  const statusCounts = {
    all: estimates.length,
    draft: estimates.filter(e => e.status === 'draft').length,
    sent: estimates.filter(e => e.status === 'sent').length,
    approved: estimates.filter(e => e.status === 'approved').length,
    rejected: estimates.filter(e => e.status === 'rejected').length,
    expired: estimates.filter(e => e.status === 'expired').length,
  };

  // Calculate totals
  const totals = {
    pending: estimates
      .filter(e => e.status === 'sent')
      .reduce((sum, e) => sum + e.amount, 0),
    approved: estimates
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + e.amount, 0),
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1>Estimates</h1>
            <p className="text-muted-foreground">Create and manage project estimates</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            New Estimate
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load estimates. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        {!isLoading && estimates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <FileText className="size-4" />
                Pending Approval
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totals.pending)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {statusCounts.sent} estimate(s)
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <CheckCircle className="size-4" />
                Approved
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.approved)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {statusCounts.approved} estimate(s)
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <FileText className="size-4" />
                Conversion Rate
              </div>
              <p className="text-2xl font-bold">
                {estimates.length > 0
                  ? Math.round((statusCounts.approved / estimates.length) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {statusCounts.approved} of {estimates.length} approved
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status Tabs */}
          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as EstimateStatus | 'all')}>
            <TabsList>
              <TabsTrigger value="all">
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="draft">
                Draft ({statusCounts.draft})
              </TabsTrigger>
              <TabsTrigger value="sent">
                Sent ({statusCounts.sent})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({statusCounts.approved})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by estimate #, client, or email..."
            className="sm:max-w-md sm:ml-auto"
          />
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          /* Data Table */
          <DataTable
            data={filteredEstimates}
            columns={columns}
            keyExtractor={(estimate) => estimate.id}
            emptyState={
              <EmptyState
                icon={FileText}
                title="No estimates found"
                description={
                  search
                    ? 'Try adjusting your search to find what you\'re looking for.'
                    : statusFilter === 'all'
                    ? 'Get started by creating your first estimate.'
                    : `No ${statusFilter} estimates at the moment.`
                }
                action={
                  !search && statusFilter === 'all'
                    ? {
                        label: 'Create Estimate',
                        onClick: () => setCreateDialogOpen(true),
                      }
                    : undefined
                }
              />
            }
          />
        )}

        {/* Stats Footer */}
        {!isLoading && estimates.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Showing {filteredEstimates.length} of {estimates.length} estimates
            </p>
            <p>
              Total Value: {formatCurrency(filteredEstimates.reduce((sum, est) => sum + est.amount, 0))}
            </p>
          </div>
        )}
      </div>

      {/* Create Estimate Dialog */}
      <CreateEstimateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* View Estimate Dialog */}
      <ViewEstimateDialog
        estimate={viewTarget}
        open={!!viewTarget}
        onOpenChange={(open) => !open && setViewTarget(null)}
        onConvertToInvoice={handleConvertToInvoice}
      />
    </AppLayout>
  );
}
