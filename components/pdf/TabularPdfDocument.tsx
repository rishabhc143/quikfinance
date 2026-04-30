import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PdfExportPayload } from "@/lib/pdf/export";
import { formatPdfDate, formatPdfMoney, formatPdfNumber, formatPdfText } from "@/lib/pdf/format";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    color: "#0f172a",
    backgroundColor: "#ffffff"
  },
  hero: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    color: "#FFFFFF"
  },
  header: {
    marginBottom: 10
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#FFFFFF"
  },
  subtitle: {
    marginTop: 6,
    fontSize: 10,
    color: "#CBD5E1"
  },
  generatedAt: {
    marginTop: 4,
    fontSize: 9,
    color: "#E2E8F0"
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10
  },
  summaryCard: {
    width: "31%",
    minWidth: 150,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f8fafc"
  },
  summaryLabel: {
    fontSize: 9,
    color: "#64748b",
    textTransform: "uppercase"
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 700
  },
  sectionWrap: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 6,
    marginTop: 6
  },
  table: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    overflow: "hidden"
  },
  tableHeader: {
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
  headerCell: {
    padding: 8,
    fontSize: 9,
    fontWeight: 700
  },
  cell: {
    padding: 8,
    fontSize: 9
  },
  totalsWrap: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
    alignSelf: "flex-end",
    minWidth: 220
  },
  totalsTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3
  },
  footer: {
    position: "absolute",
    left: 30,
    right: 30,
    bottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#64748b"
  }
});

function formatCell(value: unknown, kind?: string) {
  if (kind === "money") return formatPdfMoney(value);
  if (kind === "number") return formatPdfNumber(value);
  if (kind === "date") return formatPdfDate(value);
  if (kind === "boolean") return formatPdfText(value);
  return formatPdfText(value);
}

export function TabularPdfDocument({ payload }: { payload: PdfExportPayload }) {
  const columnWidth = `${100 / Math.max(payload.columns.length, 1)}%`;
  const generatedAt = formatPdfDate(new Date().toISOString());

  return (
    <Document title={payload.title}>
      <Page size="A4" orientation={payload.orientation ?? (payload.columns.length > 5 ? "landscape" : "portrait")} style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.header}>
            <Text style={styles.title}>{payload.title}</Text>
            {payload.subtitle ? <Text style={styles.subtitle}>{payload.subtitle}</Text> : null}
            <Text style={styles.generatedAt}>Generated on {generatedAt}</Text>
          </View>

          {payload.summary?.length ? (
            <View style={styles.summaryGrid}>
              {payload.summary.map((item) => (
                <View key={item.label} style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {payload.sections?.map((section) => (
          <View key={section.title} style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.values.map((value) => (
              <View key={`${section.title}-${value.label}`} style={styles.sectionRow}>
                <Text>{value.label}</Text>
                <Text>{value.value}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            {payload.columns.map((column) => (
              <View key={column.key} style={{ width: columnWidth }}>
                <Text style={styles.headerCell}>{column.label}</Text>
              </View>
            ))}
          </View>
          {payload.rows.map((row, index) => (
            <View key={String(row.id ?? index)} style={index % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}>
              {payload.columns.map((column) => (
                <View key={`${String(row.id ?? index)}-${column.key}`} style={{ width: columnWidth }}>
                  <Text style={styles.cell}>{formatCell(row[column.key], column.kind)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {payload.totals?.length ? (
          <View style={styles.totalsWrap}>
            <Text style={styles.totalsTitle}>Computed totals</Text>
            {payload.totals.map((item) => (
              <View key={item.label} style={styles.totalsRow}>
                <Text>{item.label}</Text>
                <Text>{item.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>QuikFinance export</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
