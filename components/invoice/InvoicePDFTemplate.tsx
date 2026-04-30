import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoicePdfData } from "@/lib/invoice-pdf";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, color: "#172033", fontFamily: "Helvetica", backgroundColor: "#FFFFFF" },
  hero: { backgroundColor: "#0F3D3E", borderRadius: 14, padding: 18, marginBottom: 18, color: "#FFFFFF" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  header: { flexDirection: "row", justifyContent: "space-between" },
  brand: { fontSize: 22, fontWeight: 700, color: "#FFFFFF" },
  heroSubtitle: { marginTop: 4, color: "#D1FAE5" },
  heroMuted: { color: "#E2E8F0", marginTop: 2 },
  invoiceTitle: { fontSize: 22, fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase" },
  badge: { marginTop: 8, alignSelf: "flex-end", borderWidth: 1, borderColor: "#8FE3DA", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontSize: 9, color: "#D1FAE5" },
  statGrid: { flexDirection: "row", marginTop: 14 },
  statCard: { flex: 1, backgroundColor: "#F8FAFC", borderRadius: 10, padding: 10, border: "1px solid #D6E3EC" },
  statCardMiddle: { marginHorizontal: 8 },
  statLabel: { fontSize: 8, textTransform: "uppercase", color: "#64748B" },
  statValue: { marginTop: 6, fontSize: 12, fontWeight: 700, color: "#0F172A" },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", color: "#0F172A" },
  card: { border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, marginBottom: 14, backgroundColor: "#FFFFFF" },
  muted: { color: "#475569" },
  tableWrap: { border: "1px solid #CBD5E1", borderRadius: 10, overflow: "hidden", marginBottom: 14 },
  tableHeader: { flexDirection: "row", backgroundColor: "#0F172A", padding: 9, borderTopLeftRadius: 8, borderTopRightRadius: 8, fontWeight: 700, color: "#FFFFFF" },
  tableRow: { flexDirection: "row", padding: 9, borderBottom: "1px solid #E2E8F0" },
  tableRowAlt: { backgroundColor: "#F8FAFC" },
  colDescription: { flex: 2.2 },
  colHsn: { flex: 1 },
  colQty: { flex: 0.8, textAlign: "right" },
  colRate: { flex: 1, textAlign: "right" },
  colTax: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  totalValue: { fontSize: 11, fontWeight: 700 },
  qrCard: { backgroundColor: "#F8FAFC", borderRadius: 10, padding: 12, border: "1px solid #E2E8F0" },
  totalsCard: { border: "1px solid #CBD5E1", borderRadius: 10, padding: 12, backgroundColor: "#FFFFFF" },
  grandTotalBand: { marginTop: 12, backgroundColor: "#0F3D3E", borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", color: "#FFFFFF" },
  small: { fontSize: 9 },
  footer: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  footerNote: { maxWidth: "58%", fontSize: 8.5, color: "#64748B" },
  signatureBox: { minWidth: 180, alignItems: "center" },
  signatureLine: { marginTop: 30, width: "100%", borderTop: "1px solid #94A3B8" },
  signatureText: { marginTop: 6, fontSize: 9, color: "#475569" }
});

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

export function InvoicePDFTemplate({ invoice }: { invoice: InvoicePdfData }) {
  const totalQuantity = invoice.lineItems.reduce((sum, line) => sum + Number(line.quantity ?? 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.header}>
            <View style={{ maxWidth: "60%" }}>
              <Text style={styles.brand}>{invoice.companyName}</Text>
              {invoice.companySubtitle ? <Text style={styles.heroSubtitle}>{invoice.companySubtitle}</Text> : null}
              {invoice.companyAddress.map((line) => (
                <Text key={line} style={styles.heroMuted}>{line}</Text>
              ))}
              {invoice.companyGstin ? <Text style={styles.heroMuted}>GSTIN: {invoice.companyGstin}</Text> : null}
              {invoice.companyPan ? <Text style={styles.heroMuted}>PAN: {invoice.companyPan}</Text> : null}
              {invoice.companyEmail ? <Text style={styles.heroMuted}>Email: {invoice.companyEmail}</Text> : null}
            </View>
            <View style={{ alignItems: "flex-end", maxWidth: "38%" }}>
              <Text style={styles.invoiceTitle}>Tax Invoice</Text>
              <Text style={styles.heroMuted}>Invoice No: {invoice.invoiceNumber}</Text>
              <Text style={styles.heroMuted}>Issue Date: {invoice.issueDate}</Text>
              <Text style={styles.heroMuted}>Due Date: {invoice.dueDate}</Text>
              {invoice.placeOfSupply ? <Text style={styles.heroMuted}>Place of Supply: {invoice.placeOfSupply}</Text> : null}
              <Text style={styles.badge}>PAYABLE {money(invoice.total)}</Text>
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Line Items</Text>
              <Text style={styles.statValue}>{invoice.lineItems.length}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardMiddle]}>
              <Text style={styles.statLabel}>Total Quantity</Text>
              <Text style={styles.statValue}>{totalQuantity.toFixed(2)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Amount Due</Text>
              <Text style={styles.statValue}>{money(invoice.total)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.row, { gap: 12, marginBottom: 14 }]}>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text>{invoice.customerName}</Text>
            {invoice.customerAddress.map((line) => (
              <Text key={line} style={styles.muted}>{line}</Text>
            ))}
            {invoice.customerEmail ? <Text style={styles.muted}>Email: {invoice.customerEmail}</Text> : null}
            {invoice.customerGstin ? <Text style={styles.muted}>GSTIN: {invoice.customerGstin}</Text> : null}
          </View>
          <View style={[styles.card, { flex: 0.8 }]}>
            <Text style={styles.sectionTitle}>E-Invoice</Text>
            <Text>IRN: {invoice.irn}</Text>
            <Text>Ack No: {invoice.ackNumber}</Text>
            <Text>Ack Date: {invoice.ackDate}</Text>
          </View>
        </View>

        <View style={styles.tableWrap}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colHsn}>HSN/SAC</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colTax}>Tax</Text>
            <Text style={styles.colTotal}>Amount</Text>
          </View>
          {invoice.lineItems.map((line, index) => (
            <View key={`${line.description}-${index}`} style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
              <Text style={styles.colDescription}>{line.description}</Text>
              <Text style={styles.colHsn}>{line.hsnSac}</Text>
              <Text style={styles.colQty}>{line.quantity.toFixed(2)}</Text>
              <Text style={styles.colRate}>{money(line.rate)}</Text>
              <Text style={styles.colTax}>{money(line.taxAmount)}</Text>
              <Text style={styles.colTotal}>{money(line.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.row, { gap: 12 }]}>
          <View style={[styles.qrCard, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Payment & Share</Text>
            {invoice.paymentLinkUrl ? <Text style={styles.small}>Payment Link: {invoice.paymentLinkUrl}</Text> : <Text style={styles.small}>Payment link will appear once generated.</Text>}
            {invoice.upiId ? <Text style={styles.small}>UPI ID: {invoice.upiId}</Text> : null}
            {invoice.upiUri ? <Text style={styles.small}>UPI Intent: {invoice.upiUri}</Text> : null}
            <Text style={[styles.small, { marginTop: 8 }]}>Share this invoice on WhatsApp with the payment link for faster collections.</Text>
          </View>
          <View style={[styles.totalsCard, { flex: 0.9 }]}>
            <Text style={styles.sectionTitle}>GST Breakup</Text>
            <View style={styles.totalRow}><Text>Taxable Value</Text><Text>{money(invoice.subtotal)}</Text></View>
            <View style={styles.totalRow}><Text>CGST</Text><Text>{money(invoice.taxBreakup.cgst)}</Text></View>
            <View style={styles.totalRow}><Text>SGST</Text><Text>{money(invoice.taxBreakup.sgst)}</Text></View>
            <View style={styles.totalRow}><Text>IGST</Text><Text>{money(invoice.taxBreakup.igst)}</Text></View>
            <View style={styles.totalRow}><Text>Discount</Text><Text>{money(invoice.discountTotal)}</Text></View>
            <View style={styles.totalRow}><Text>Round Off</Text><Text>{money(invoice.roundOff)}</Text></View>
            <View style={styles.grandTotalBand}><Text style={styles.totalValue}>Grand Total</Text><Text style={styles.totalValue}>{money(invoice.total)}</Text></View>
          </View>
        </View>

        {(invoice.notes || invoice.terms) ? (
          <View style={[styles.card, { marginTop: 14 }]}>
            {invoice.notes ? (
              <View style={{ marginBottom: invoice.terms ? 10 : 0 }}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.muted}>{invoice.notes}</Text>
              </View>
            ) : null}
            {invoice.terms ? (
              <View>
                <Text style={styles.sectionTitle}>Terms</Text>
                <Text style={styles.muted}>{invoice.terms}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.footerNote}>
            <Text>This is a system-generated commercial document prepared from QuikFinance. Please verify tax registration, supply location, and payment details before external issuance.</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>Authorised Signatory</Text>
            <Text style={styles.signatureText}>For {invoice.companyName}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
