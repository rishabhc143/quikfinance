import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: "#172033", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  brand: { fontSize: 24, fontWeight: 700, color: "#0EA5E9" },
  title: { fontSize: 20, fontWeight: 700 },
  section: { marginBottom: 18 },
  row: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1px solid #E5E7EB", paddingVertical: 8 },
  total: { flexDirection: "row", justifyContent: "space-between", marginTop: 18, fontSize: 14, fontWeight: 700 }
});

export type InvoicePdfData = {
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxTotal: number;
  total: number;
};

export function InvoicePDFTemplate({ invoice }: { invoice: InvoicePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>QuikFinance</Text>
            <Text>Cloud accounting</Text>
          </View>
          <View>
            <Text style={styles.title}>Invoice</Text>
            <Text>{invoice.invoiceNumber}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text>Bill to</Text>
          <Text>{invoice.customerName}</Text>
          <Text>Issue date: {invoice.issueDate}</Text>
          <Text>Due date: {invoice.dueDate}</Text>
        </View>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text>Services</Text>
            <Text>{invoice.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Tax</Text>
            <Text>{invoice.taxTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.total}>
            <Text>Total</Text>
            <Text>{invoice.total.toFixed(2)}</Text>
          </View>
        </View>
        <Text>Thank you for your business.</Text>
      </Page>
    </Document>
  );
}
