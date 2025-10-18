# Sierra Painting - TODO List

## High Priority Features

### Invoice Management

- [ ] **ViewInvoiceDialog** - Create a dialog/modal to display full invoice details
  - Show invoice number, client information
  - Display line items/services (if applicable)
  - Show payment history with dates and amounts
  - Display status timeline (draft → sent → paid)
  - Add print/download PDF functionality
  - Show remaining balance for partial payments
  - File: `src/components/dialogs/ViewInvoiceDialog.tsx`
  - Usage: InvoicesScreen.tsx - currently commented out View button

### Employee/User Management

- [ ] Test employee invitation flow after security rule fix
- [ ] Add email sending for employee invitations (currently shows placeholder)
- [ ] Create employee onboarding flow for first-time login

### Job Management

- [ ] Job detail view/dialog
- [ ] Job status update workflow
- [ ] Assign workers to jobs

### Estimate Management

- [ ] Create estimate functionality
- [ ] Convert estimate to invoice
- [ ] Estimate approval workflow

## Medium Priority

### Reports & Analytics

- [ ] Revenue reports by month/quarter
- [ ] Outstanding invoices report
- [ ] Job completion metrics
- [ ] Worker productivity tracking

### Notifications

- [ ] Overdue invoice notifications
- [ ] Job deadline reminders
- [ ] Payment received notifications

### File Attachments

- [ ] Upload photos to jobs
- [ ] Attach receipts to invoices
- [ ] Store contracts and documents

## Low Priority / Nice to Have

### UI/UX Improvements

- [ ] Dark mode support
- [ ] Mobile responsive design improvements
- [ ] Keyboard shortcuts
- [ ] Bulk actions (select multiple invoices)

### Advanced Features

- [ ] Recurring invoices
- [ ] Invoice templates
- [ ] Custom branding (logo, colors)
- [ ] Multi-currency support
- [ ] Integration with accounting software

## Bug Fixes / Technical Debt

- [x] Fixed: Firestore undefined value errors (clientEmail, paidDate, etc.)
- [x] Fixed: Missing companyId on user creation
- [x] Fixed: Partial payments moving invoice to wrong tab
- [x] Fixed: Empty SelectItem value error
- [x] Fixed: Employee invitation permission denied
- [ ] Add comprehensive error boundaries
- [ ] Add loading states for all async operations
- [ ] Improve form validation error messages

## Documentation

- [ ] Add JSDoc comments to all hooks
- [ ] Create user guide for admin features
- [ ] Document Firebase security rules
- [ ] Create API documentation for custom functions
