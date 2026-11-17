/** Limits the billers and expenses forms show and the API enforces. */
export const accountingLimits = {
  billerNameMaxLength: 80,
  contactMaxLength: 120,
  notesMaxLength: 500,
  descriptionMaxLength: 120,
  maxBillers: 200,
  /** Expenses a club can keep. */
  maxExpenses: 5000,
  invoiceTitleMaxLength: 120,
  /** Payers on one manual invoice. */
  maxPayers: 200,
  /** Manual invoices a club can keep. */
  maxInvoices: 2000,
  /** Months the dashboard spans at most (wider ranges are refused). */
  maxMonths: 60,
}
