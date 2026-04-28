export type WorkPlanSection = {
  title: string;
  summary: string;
  items: string[];
};

export const workPlanHighlights = [
  "Accounting control and governance",
  "Banking and reconciliation depth",
  "Reporting and export readiness",
  "Client-facing workflow polish",
  "Role and security hardening",
  "Final demo readiness"
];

export const workPlanSections: WorkPlanSection[] = [
  {
    title: "Week 1: Banking And Reconciliation Hardening",
    summary: "Improve operational depth across bank accounts, statement review, reconciliation matching, and payment operations.",
    items: [
      "Strengthen bank account workspace depth",
      "Improve reconciliation visibility and unmatched-line review",
      "Expose bank exceptions more clearly",
      "Tighten links between bank feeds, reconciliation, settlements, and payment operations"
    ]
  },
  {
    title: "Week 1: Reporting And Export Readiness",
    summary: "Make reports easier to present, export, and review during demos and pilot usage.",
    items: [
      "Improve drilldowns from dashboard and module surfaces",
      "Strengthen CSV export consistency across reports",
      "Improve printable report layouts",
      "Tighten report action surfaces and filtering"
    ]
  },
  {
    title: "Week 1: Governance And Audit Controls",
    summary: "Increase confidence in change visibility, control review, and finance governance flows.",
    items: [
      "Improve audit trail filtering and review depth",
      "Increase visibility into company-setting and compliance changes",
      "Strengthen close and lock-related review surfaces"
    ]
  },
  {
    title: "Week 1: Role And Permission Hardening",
    summary: "Tighten role behavior across sensitive modules and admin controls.",
    items: [
      "Verify owner, admin, accountant, and viewer behavior",
      "Tighten write restrictions where needed",
      "Review company, user, settings, and lock-related permissions"
    ]
  },
  {
    title: "Week 2: Remaining Thin Module Hardening",
    summary: "Replace remaining generic-feeling control screens with dedicated operational workspaces.",
    items: [
      "Strengthen currencies and user-role control surfaces",
      "Improve bank-account list and control flows",
      "Improve audit trail review depth",
      "Reduce repeated generic module patterns"
    ]
  },
  {
    title: "Week 2: Client Demo Flow Polish",
    summary: "Make the main demo path smoother and easier to explain live.",
    items: [
      "Improve page-to-page navigation",
      "Reduce dead-end or awkward action flows",
      "Improve contextual CTA placement",
      "Clarify workflow wording and action labels"
    ]
  },
  {
    title: "Week 2: OCR, Compliance, And Finance Workflow Polish",
    summary: "Make OCR and compliance flows more operationally coherent.",
    items: [
      "Improve OCR status visibility and next actions",
      "Improve failed, reviewed, and blocked compliance flows",
      "Improve exception-to-record linkage",
      "Strengthen E-Invoicing, E-Way Bill, and TDS/TCS usability"
    ]
  },
  {
    title: "Week 2: Final Pilot-Readiness QA Pass",
    summary: "Run focused verification on the workflows that matter most for pilot usage and demo safety.",
    items: [
      "Verify onboarding, masters, transactions, GST, OCR, and reports",
      "Verify audit, lock, and protected-route behavior",
      "Close remaining demo-critical gaps"
    ]
  }
];

export const workPlanDeliverables = [
  "Hardened banking and reconciliation workflow surfaces",
  "Stronger report and export readiness",
  "Stronger audit and governance controls",
  "Improved role and permission confidence",
  "More polished compliance and OCR workflows",
  "Smoother client demo flow",
  "Updated documentation and QA notes"
];

export const workPlanSuccessCriteria = [
  "The app feels stronger in the modules that still looked generic or thin",
  "Demo-critical workflows are smoother and more reliable",
  "Financial control surfaces are more deliberate",
  "Reports are easier to present to clients",
  "The product is more credible for pilot and demo usage"
];
