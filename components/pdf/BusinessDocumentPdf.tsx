import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatPdfDate, formatPdfMoney, formatPdfText } from "@/lib/pdf/format";

export type BusinessDocumentPdfData = {
  documentTitle: string;
  documentNumber: string;
  status: string;
  issueDate: string;
  secondaryDateLabel: string;
  secondaryDateValue: string;
  companyName: string;
  companySubtitle: string;
  companyAddress: string[];
  companyGstin: string;
  companyPan: string;
  companyEmail: string;
  counterpartLabel: string;
  counterpartName: string;
  counterpartEmail: string;
  placeOfSupply?: string;
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  roundOff?: number;
  total: number;
  balanceDue?: number;
  notes?: string | null;
  terms?: string | null;
  relatedLabel?: string;
  relatedNumber?: string | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    rate: number;
    discount?: number;
    taxAmount?: number;
    lineTotal?: number;
  }>;
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    color: "#0f172a",
    backgroundColor: "#ffffff"
  },
  hero: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    color: "#FFFFFF"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8
  },
  companyBlock: {
    width: "58%"
  },
  docBlock: {
    width: "38%",
    alignItems: "flex-end"
  },
  companyName: {
    fontSize: 20,
    fontWeight: 700,
    color: "#FFFFFF"
  },
  companySubtitle: {
    marginTop: 4,
    fontSize: 10,
    color: "#CBD5E1"
  },
  companyText: {
    marginTop: 3,
    color: "#E2E8F0"
  },
  docTitle: {
    fontSize: 18,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#FFFFFF"
  },
  docNumber: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 700,
    color: "#E2E8F0"
  },
  docStatus: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#94A3B8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 9,
    color: "#E2E8F0"
  },
  heroStats: {
    flexDirection: "row",
    marginTop: 12
  },
  heroStat: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10
  },
  heroStatMiddle: {
    marginHorizontal: 8
  },
  heroStatLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    color: "#64748B"
  },
  heroStatValue: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 700
  },
  bodyGrid: {
    flexDirection: "row",
    marginBottom: 16
  },
  box: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10
  },
  boxLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 6
  },
  boxText: {
    marginBottom: 3
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16
  },
  metaCard: {
    width: "31%",
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f8fafc"
  },
  metaLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    color: "#64748b"
  },
  metaValue: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: 700
  },
  table: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    overflow: "hidden"
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    color: "#ffffff"
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0"
  },
  rowAlt: {
    backgroundColor: "#F8FAFC"
  },
  cell: {
    padding: 8,
    fontSize: 9
  },
  totalsWrap: {
    marginTop: 16,
    alignSelf: "flex-end",
    width: "45%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    fontSize: 12,
    fontWeight: 700
  },
  notesGrid: {
    marginTop: 18,
    flexDirection: "row"
  },
  noteBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10
  },
  footer: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  footerNote: {
    maxWidth: "58%",
    fontSize: 8.5,
    color: "#64748B"
  },
  signatureBox: {
    minWidth: 180,
    alignItems: "center"
  },
  signatureLine: {
    marginTop: 30,
    width: "100%",
    borderTop: "1px solid #94A3B8"
  },
  signatureText: {
    marginTop: 6,
    fontSize: 9,
    color: "#475569"
  }
});

export function BusinessDocumentPdf({ document }: { document: BusinessDocumentPdfData }) {
  const totalQuantity = document.lineItems.reduce((sum, line) => sum + Number(line.quantity ?? 0), 0);

  return (
    <Document title={`${document.documentTitle} ${document.documentNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.header}>
            <View style={styles.companyBlock}>
              <Text style={styles.companyName}>{document.companyName}</Text>
              {document.companySubtitle ? <Text style={styles.companySubtitle}>{document.companySubtitle}</Text> : null}
              {document.companyAddress.map((line, index) => (
                <Text key={`${line}-${index}`} style={styles.companyText}>{line}</Text>
              ))}
              {document.companyEmail ? <Text style={styles.companyText}>Email: {document.companyEmail}</Text> : null}
              {document.companyGstin ? <Text style={styles.companyText}>GSTIN: {document.companyGstin}</Text> : null}
              {document.companyPan ? <Text style={styles.companyText}>PAN: {document.companyPan}</Text> : null}
            </View>
            <View style={styles.docBlock}>
              <Text style={styles.docTitle}>{document.documentTitle}</Text>
              <Text style={styles.docNumber}>{document.documentNumber}</Text>
              <Text style={styles.docStatus}>{document.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Document value</Text>
              <Text style={styles.heroStatValue}>{formatPdfMoney(document.total)}</Text>
            </View>
            <View style={[styles.heroStat, styles.heroStatMiddle]}>
              <Text style={styles.heroStatLabel}>{document.secondaryDateLabel}</Text>
              <Text style={styles.heroStatValue}>{formatPdfDate(document.secondaryDateValue)}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Quantity</Text>
              <Text style={styles.heroStatValue}>{formatPdfText(totalQuantity)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bodyGrid}>
          <View style={[styles.box, { marginRight: 14 }]}>
            <Text style={styles.boxLabel}>{document.counterpartLabel}</Text>
            <Text style={styles.boxText}>{document.counterpartName}</Text>
            {document.counterpartEmail ? <Text style={styles.boxText}>{document.counterpartEmail}</Text> : null}
            {document.placeOfSupply ? <Text style={styles.boxText}>Place of supply: {document.placeOfSupply}</Text> : null}
            {document.relatedLabel && document.relatedNumber ? <Text style={styles.boxText}>{document.relatedLabel}: {document.relatedNumber}</Text> : null}
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Document details</Text>
            <Text style={styles.boxText}>Issue date: {formatPdfDate(document.issueDate)}</Text>
            <Text style={styles.boxText}>{document.secondaryDateLabel}: {formatPdfDate(document.secondaryDateValue)}</Text>
            {typeof document.balanceDue === "number" ? <Text style={styles.boxText}>Balance due: {formatPdfMoney(document.balanceDue)}</Text> : null}
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>Line items</Text>
            <Text style={styles.metaValue}>{document.lineItems.length}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>Quantity</Text>
            <Text style={styles.metaValue}>{formatPdfText(totalQuantity)}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>Document value</Text>
            <Text style={styles.metaValue}>{formatPdfMoney(document.total)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.cell, { width: "34%", fontWeight: 700 }]}>Description</Text>
            <Text style={[styles.cell, { width: "11%", fontWeight: 700 }]}>Qty</Text>
            <Text style={[styles.cell, { width: "15%", fontWeight: 700 }]}>Rate</Text>
            <Text style={[styles.cell, { width: "12%", fontWeight: 700 }]}>Discount</Text>
            <Text style={[styles.cell, { width: "12%", fontWeight: 700 }]}>Tax</Text>
            <Text style={[styles.cell, { width: "16%", fontWeight: 700 }]}>Line total</Text>
          </View>
          {document.lineItems.map((line, index) => (
            <View key={`${line.description}-${index}`} style={index % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}>
              <Text style={[styles.cell, { width: "34%" }]}>{formatPdfText(line.description)}</Text>
              <Text style={[styles.cell, { width: "11%" }]}>{formatPdfText(line.quantity)}</Text>
              <Text style={[styles.cell, { width: "15%" }]}>{formatPdfMoney(line.rate)}</Text>
              <Text style={[styles.cell, { width: "12%" }]}>{formatPdfMoney(line.discount ?? 0)}</Text>
              <Text style={[styles.cell, { width: "12%" }]}>{formatPdfMoney(line.taxAmount ?? 0)}</Text>
              <Text style={[styles.cell, { width: "16%" }]}>{formatPdfMoney(line.lineTotal ?? 0)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsWrap}>
          {typeof document.subtotal === "number" ? (
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text>{formatPdfMoney(document.subtotal)}</Text>
            </View>
          ) : null}
          {typeof document.discountTotal === "number" ? (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>{formatPdfMoney(document.discountTotal)}</Text>
            </View>
          ) : null}
          {typeof document.taxTotal === "number" ? (
            <View style={styles.totalRow}>
              <Text>Tax</Text>
              <Text>{formatPdfMoney(document.taxTotal)}</Text>
            </View>
          ) : null}
          {typeof document.roundOff === "number" && document.roundOff !== 0 ? (
            <View style={styles.totalRow}>
              <Text>Round off</Text>
              <Text>{formatPdfMoney(document.roundOff)}</Text>
            </View>
          ) : null}
          <View style={styles.grandTotalRow}>
            <Text>Total</Text>
            <Text>{formatPdfMoney(document.total)}</Text>
          </View>
        </View>

        {(document.notes || document.terms) ? (
          <View style={styles.notesGrid}>
            {document.notes ? (
              <View style={document.terms ? [styles.noteBox, { marginRight: 14 }] : styles.noteBox}>
                <Text style={styles.boxLabel}>Notes</Text>
                <Text>{formatPdfText(document.notes)}</Text>
              </View>
            ) : null}
            {document.terms ? (
              <View style={styles.noteBox}>
                <Text style={styles.boxLabel}>Terms</Text>
                <Text>{formatPdfText(document.terms)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.footerNote}>
            <Text>This is a system-generated commercial document from QuikFinance. Review counterpart details, taxes, and internal approval status before external circulation.</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>Authorised Signatory</Text>
            <Text style={styles.signatureText}>For {document.companyName}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
