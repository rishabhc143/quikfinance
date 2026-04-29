export function getEntityHref(entityType: string | null | undefined, entityId: string | null | undefined) {
  if (!entityType || !entityId) return null;

  const byEntity: Record<string, string> = {
    customer: `/customers/${entityId}`,
    vendor: `/vendors/${entityId}`,
    invoice: `/invoices/${entityId}`,
    bill: `/bills/${entityId}`,
    expense: `/expenses/${entityId}`,
    payment: "/payments",
    project: `/projects/${entityId}`,
    bank_account: `/bank-accounts/${entityId}`,
    bank_transaction: `/bank-accounts`,
    reconciliation: "/bank-accounts",
    razorpay_settlement: "/settlements",
    e_invoice_submission: `/e-invoicing/${entityId}`,
    e_way_bill: `/e-way-bill/${entityId}`,
    tds_tcs_record: `/tds-tcs/${entityId}`,
    fixed_asset: `/fixed-assets/${entityId}`,
    delivery_dispatch: `/delivery-dispatch/${entityId}`,
    company: "/settings/company",
    template_settings: "/templates",
    user: "/settings/users"
  };

  return byEntity[entityType] ?? null;
}

export function getEntityLabel(entityType: string | null | undefined) {
  if (!entityType) return "Record";

  const labels: Record<string, string> = {
    customer: "Customer",
    vendor: "Vendor",
    invoice: "Invoice",
    bill: "Bill",
    expense: "Expense",
    payment: "Payment",
    project: "Project",
    bank_account: "Bank account",
    bank_transaction: "Bank transaction",
    reconciliation: "Reconciliation",
    razorpay_settlement: "Settlement",
    e_invoice_submission: "E-Invoicing",
    e_way_bill: "E-Way Bill",
    tds_tcs_record: "TDS / TCS",
    fixed_asset: "Fixed asset",
    delivery_dispatch: "Dispatch",
    company: "Company settings",
    template_settings: "Template settings",
    user: "User"
  };

  return labels[entityType] ?? entityType.replaceAll("_", " ");
}
