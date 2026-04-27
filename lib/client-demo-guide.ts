export type DemoGuideStep = {
  title: string;
  route?: string;
  points: string[];
  talkingPoints?: string[];
};

export const clientDemoGuide: DemoGuideStep[] = [
  {
    title: "Login And Setup",
    route: "/company-setup",
    points: [
      "Sign in and complete company profile details.",
      "Set base currency, fiscal year, invoice prefix, and address details.",
      "Finish the initial onboarding checklist before daily operations."
    ],
    talkingPoints: [
      "This is a one-time company configuration step.",
      "QuikFinance blocks operational screens until the business setup is complete."
    ]
  },
  {
    title: "Add Master Data",
    points: [
      "Create customers.",
      "Create vendors.",
      "Create items or services.",
      "Create at least one bank account."
    ],
    talkingPoints: [
      "These records are reused across invoices, bills, expenses, and reports."
    ]
  },
  {
    title: "Create A Sales Invoice",
    route: "/invoices/new",
    points: [
      "Choose the customer.",
      "Add line items with quantity and rate.",
      "Let the backend calculate GST and total.",
      "Save or send the invoice."
    ],
    talkingPoints: [
      "Invoice totals are not trusted from the UI; the backend recalculates them.",
      "A posted invoice updates receivables and accounting journals."
    ]
  },
  {
    title: "Record Customer Payment",
    route: "/payments/received",
    points: [
      "Open the invoice and record payment.",
      "Select method, date, reference, and bank account.",
      "Save to update invoice status and balances."
    ],
    talkingPoints: [
      "Payment posting updates both receivables and bank balance."
    ]
  },
  {
    title: "Create A Purchase Bill",
    route: "/bills/new",
    points: [
      "Choose the vendor.",
      "Add line items and review GST input.",
      "Save or approve the bill."
    ],
    talkingPoints: [
      "Bills drive payables and input tax credit."
    ]
  },
  {
    title: "Record Vendor Payment",
    route: "/payments/made",
    points: [
      "Open the bill and record payment.",
      "Choose the payout account and payment method.",
      "Save to reduce payable balance."
    ],
    talkingPoints: [
      "Bill payment updates both payable status and bank balance."
    ]
  },
  {
    title: "Record Expenses",
    route: "/expenses/new",
    points: [
      "Pick the expense ledger/category.",
      "Enter amount, GST, vendor, and payment source.",
      "Save to post the expense into accounting."
    ],
    talkingPoints: [
      "Expenses are posted directly into journals and reflected in reports."
    ]
  },
  {
    title: "OCR Bill Capture",
    route: "/ocr-bills/new",
    points: [
      "Upload a bill file.",
      "Parse OCR data.",
      "Review extracted values.",
      "Create a draft bill from OCR."
    ],
    talkingPoints: [
      "OCR reduces manual entry, but the user can still review and correct data before final posting."
    ]
  },
  {
    title: "Review Dashboard And Reports",
    route: "/dashboard",
    points: [
      "Review dashboard KPIs.",
      "Open GST Summary and GST Parity.",
      "Open Profit & Loss, Balance Sheet, and Cash Flow."
    ],
    talkingPoints: [
      "The reports are based on live transaction data, not placeholder numbers."
    ]
  }
];

export const recommendedDemoOrder = [
  "Login",
  "Company setup",
  "Customer creation",
  "Vendor creation",
  "Item creation",
  "Bank account creation",
  "Invoice creation",
  "Customer payment",
  "Bill creation",
  "Vendor payment",
  "Expense posting",
  "OCR bill capture",
  "Dashboard review",
  "GST reports",
  "Financial reports"
];
