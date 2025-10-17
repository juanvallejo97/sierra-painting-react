import { useState } from 'react';
// import { Link } from 'react-router-dom';
import { Plus, DollarSign, Calendar, FileText, AlertCircle, Trash2, Send, X, Eye } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DataTable, type Column } from '../components/ui/data-table';
import { EmptyState } from '../components/ui/empty-state';
import { SearchBar } from '../components/ui/search-bar';
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useInvoices, useDeleteInvoice, type Invoice, type InvoiceStatus } from '../hooks/useInvoices';
import { PartialPaymentDialog } from '../components/dialogs/PartialPaymentDialog';
import { CreateInvoiceDialog } from '../components/dialogs/CreateInvoiceDialog';
import { SendInvoiceDialog } from '../components/dialogs/SendInvoiceDialog';
import { CancelInvoiceDialog } from '../components/dialogs/CancelInvoiceDialog';
import { ConfirmDeleteDialog } from '../components/dialogs/ConfirmDeleteDialog';
import { ViewInvoiceDialog } from '../components/dialogs/ViewInvoiceDialog';

export function InvoicesScreen() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);
  const [sendTarget, setSendTarget] = useState<Invoice | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [viewTarget, setViewTarget] = useState<Invoice | null>(null);

  const deleteInvoice = useDeleteInvoice();

  // Fetch invoices based on filter
  // For 'sent' tab, fetch all and filter client-side to include partially_paid
  const shouldFetchAll = statusFilter === 'all' || statusFilter === 'sent';
  const { data: allInvoices = [], isLoading, error } = useInvoices(
    shouldFetchAll ? undefined : statusFilter
  );

  // Filter by status (for sent tab, include partially_paid)
  const invoices = statusFilter === 'sent'
    ? allInvoices.filter(i => i.status === 'sent' || i.status === 'partially_paid')
    : allInvoices;

  // Filter invoices by search
  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = search.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      invoice.client.toLowerCase().includes(searchLower) ||
      (invoice.clientEmail && invoice.clientEmail.toLowerCase().includes(searchLower))
    );
  });

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'partially_paid':
        return 'secondary'; // Amber/warning color
      case 'sent':
        return 'secondary';
      case 'draft':
        return 'outline';
      case 'overdue':
        return 'destructive';
      case 'cancelled':
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

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      render: (invoice) => (
        <div>
          <p className="font-medium font-mono text-sm">{invoice.invoiceNumber}</p>
          <p className="text-xs text-muted-foreground">{invoice.client}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (invoice) => (
        <div>
          <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
          {invoice.status === 'partially_paid' ? (
            <p className="text-xs text-orange-600">
              {formatCurrency(invoice.amountPaid)} paid ({Math.round((invoice.amountPaid / invoice.amount) * 100)}%)
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Tax: {formatCurrency(invoice.tax)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (invoice) => (
        <Badge variant={getStatusColor(invoice.status)}>
          {invoice.status === 'partially_paid'
            ? 'Partially Paid'
            : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (invoice) => (
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <div>
            <p className="text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</p>
            {invoice.status === 'overdue' && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="size-3" />
                Overdue
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (invoice) => (
        <div className="flex gap-2 justify-end">
          {/* View button - available for all statuses */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewTarget(invoice)}
          >
            <Eye className="size-3 mr-1" />
            View
          </Button>

          {/* Draft actions */}
          {invoice.status === 'draft' && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => setSendTarget(invoice)}
              >
                <Send className="size-3 mr-1" />
                Send
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteTarget(invoice)}
              >
                <Trash2 className="size-4 mr-1" />
                Delete
              </Button>
            </>
          )}

          {/* Sent/Overdue/Partially Paid actions */}
          {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'partially_paid') && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => setPaymentTarget(invoice)}
              >
                <DollarSign className="size-3 mr-1" />
                Record Payment
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelTarget(invoice)}
              >
                <X className="size-3 mr-1" />
                Cancel
              </Button>
            </>
          )}

          {/* Paid actions - view only */}
          {invoice.status === 'paid' && (
            <span className="text-sm text-success px-2">Paid ✓</span>
          )}
        </div>
      ),
    },
  ];

  // Count invoices by status
  // Note: 'sent' count includes partially_paid invoices
  const statusCounts = {
    all: allInvoices.length,
    draft: allInvoices.filter(i => i.status === 'draft').length,
    sent: allInvoices.filter(i => i.status === 'sent' || i.status === 'partially_paid').length,
    partially_paid: allInvoices.filter(i => i.status === 'partially_paid').length,
    paid: allInvoices.filter(i => i.status === 'paid').length,
    overdue: allInvoices.filter(i => i.status === 'overdue').length,
  };

  // Calculate totals (use allInvoices to get accurate totals)
  const totals = {
    outstanding: allInvoices
      .filter(i => i.status === 'sent' || i.status === 'overdue' || i.status === 'partially_paid')
      .reduce((sum, i) => sum + i.remainingBalance, 0),
    paid: allInvoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0),
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1>Invoices</h1>
            <p className="text-muted-foreground">Track and manage invoices</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            New Invoice
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load invoices. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        {!isLoading && allInvoices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="size-4" />
                Outstanding
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(totals.outstanding)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {statusCounts.sent + statusCounts.overdue + statusCounts.partially_paid} invoice(s)
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="size-4" />
                Paid This Month
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.paid)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {statusCounts.paid} invoice(s)
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <AlertCircle className="size-4" />
                Overdue
              </div>
              <p className="text-2xl font-bold text-destructive">
                {statusCounts.overdue}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Require immediate attention
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status Tabs */}
          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as InvoiceStatus | 'all')}>
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
              <TabsTrigger value="paid">
                Paid ({statusCounts.paid})
              </TabsTrigger>
              <TabsTrigger value="overdue">
                Overdue ({statusCounts.overdue})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by invoice #, client, or email..."
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
            data={filteredInvoices}
            columns={columns}
            keyExtractor={(invoice) => invoice.id}
            emptyState={
              <EmptyState
                icon={FileText}
                title="No invoices found"
                description={
                  search
                    ? 'Try adjusting your search to find what you\'re looking for.'
                    : statusFilter === 'all'
                    ? 'Get started by creating your first invoice.'
                    : `No ${statusFilter} invoices at the moment.`
                }
                action={
                  !search && statusFilter === 'all'
                    ? {
                        label: 'Create Invoice',
                        onClick: () => setCreateDialogOpen(true),
                      }
                    : undefined
                }
              />
            }
          />
        )}

        {/* Stats Footer */}
        {!isLoading && allInvoices.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Showing {filteredInvoices.length} of {invoices.length} invoices
            </p>
            <p>
              Total: {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0))}
            </p>
          </div>
        )}
      </div>

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Send Invoice Dialog */}
      <SendInvoiceDialog
        invoice={sendTarget}
        open={!!sendTarget}
        onOpenChange={(open) => !open && setSendTarget(null)}
      />

      {/* Partial/Full Payment Dialog */}
      <PartialPaymentDialog
        invoice={paymentTarget}
        open={!!paymentTarget}
        onOpenChange={(open) => !open && setPaymentTarget(null)}
      />

      {/* Cancel Invoice Dialog */}
      <CancelInvoiceDialog
        invoice={cancelTarget}
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteInvoice.mutateAsync(deleteTarget!.id)}
        title="Delete Draft Invoice"
        description={`Are you sure you want to delete invoice ${deleteTarget?.invoiceNumber} for ${deleteTarget?.client}? This action cannot be undone.`}
        isLoading={deleteInvoice.isPending}
      />

      {/* View Invoice Dialog */}
      <ViewInvoiceDialog
        invoice={viewTarget}
        open={!!viewTarget}
        onOpenChange={(open) => !open && setViewTarget(null)}
      />
    </AppLayout>
  );
}
