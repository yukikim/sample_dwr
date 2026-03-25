import "server-only";

import path from "node:path";

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import { getInvoiceDocumentLabel, type InvoiceDocumentType } from "@/lib/invoice-documents";
import { formatInvoicePeriod, type InvoiceClientGroup, type InvoiceSelectionData } from "@/lib/invoices";

type PdfAdministrator = {
  name: string;
  email: string;
};

type PdfPageData = {
  documentType: InvoiceDocumentType;
  group: InvoiceClientGroup;
  rows: InvoiceClientGroup["items"];
  sectionPageNumber: number;
  sectionPageCount: number;
};

type ColumnDefinition = {
  key: string;
  label: string;
  width: string;
  align?: "left" | "center" | "right";
  render: (item: InvoiceClientGroup["items"][number]) => string;
};

const FONT_REGULAR_PATH = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "noto-sans-jp",
  "files",
  "noto-sans-jp-japanese-400-normal.woff",
);

const FONT_BOLD_PATH = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "noto-sans-jp",
  "files",
  "noto-sans-jp-japanese-700-normal.woff",
);

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

let fontRegistered = false;

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingRight: 28,
    paddingBottom: 30,
    paddingLeft: 28,
    backgroundColor: "#f8f4ef",
    color: "#231815",
    fontFamily: "NotoSansJP",
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  brandBlock: {
    width: "44%",
    gap: 4,
  },
  label: {
    fontSize: 9,
    color: "#8a6d62",
  },
  title: {
    fontSize: 24,
    fontFamily: "NotoSansJP",
    fontWeight: 700,
  },
  brandTitle: {
    fontSize: 12,
    fontFamily: "NotoSansJP",
    fontWeight: 700,
  },
  mutedText: {
    color: "#5f4b43",
    lineHeight: 1.5,
  },
  metaPanel: {
    width: "44%",
    borderRadius: 12,
    border: "1 solid #dfd3c8",
    backgroundColor: "#fffdf9",
    padding: 12,
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 0,
    borderRadius: 12,
    backgroundColor: "#fffdf9",
    border: "1 solid #eadfd5",
    padding: 12,
    gap: 3,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: "NotoSansJP",
    fontWeight: 700,
  },
  sectionBand: {
    borderRadius: 12,
    backgroundColor: "#f1e4d8",
    paddingTop: 10,
    paddingRight: 12,
    paddingBottom: 10,
    paddingLeft: 12,
    marginBottom: 12,
  },
  sectionBandTitle: {
    fontSize: 14,
    fontFamily: "NotoSansJP",
    fontWeight: 700,
  },
  table: {
    borderRadius: 12,
    overflow: "hidden",
    border: "1 solid #decfc2",
    backgroundColor: "#fffdf9",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3e8de",
    borderBottom: "1 solid #decfc2",
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #f0e6dd",
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,
  },
  cellBase: {
    fontSize: 9,
    color: "#231815",
    paddingRight: 6,
  },
  cellHeader: {
    fontSize: 9,
    fontFamily: "NotoSansJP",
    fontWeight: 700,
    color: "#5f4b43",
    paddingRight: 6,
  },
  totalsPanel: {
    marginTop: 14,
    alignSelf: "flex-end",
    width: "46%",
    borderRadius: 12,
    border: "1 solid #decfc2",
    backgroundColor: "#fffdf9",
    padding: 12,
    gap: 6,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  footer: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: "#8a6d62",
  },
});

function ensureFontsRegistered() {
  if (fontRegistered) {
    return;
  }

  Font.register({
    family: "NotoSansJP",
    fonts: [
      {
        src: FONT_REGULAR_PATH,
        fontWeight: 400,
      },
      {
        src: FONT_BOLD_PATH,
        fontWeight: 700,
      },
    ],
  });

  fontRegistered = true;
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks.length > 0 ? chunks : [[]];
}

function getRowsPerPage(documentType: InvoiceDocumentType) {
  if (documentType === "invoice") {
    return 12;
  }

  return 14;
}

function getColumns(documentType: InvoiceDocumentType): ColumnDefinition[] {
  if (documentType === "work-slip") {
    return [
      { key: "workDate", label: "作業日", width: "12%", render: (item) => item.workDate },
      { key: "workCode", label: "作業コード", width: "15%", render: (item) => item.workCode },
      { key: "carType", label: "車種", width: "14%", render: (item) => item.carType ?? "-" },
      { key: "workMinutes", label: "作業分", width: "10%", align: "right", render: (item) => String(item.workMinutes) },
      { key: "laborMinutes", label: "工数分", width: "10%", align: "right", render: (item) => String(item.laborMinutes) },
      { key: "travelMinutes", label: "移動分", width: "10%", align: "right", render: (item) => String(item.travelMinutes) },
      { key: "unitCount", label: "台数", width: "9%", align: "right", render: (item) => String(item.unitCount) },
      { key: "remarks", label: "備考", width: "20%", render: (item) => item.remarks ?? "-" },
    ];
  }

  if (documentType === "delivery-note") {
    return [
      { key: "workDate", label: "作業日", width: "14%", render: (item) => item.workDate },
      {
        key: "description",
        label: "品目 / 作業",
        width: "32%",
        render: (item) => [item.workCode, item.carType].filter(Boolean).join(" / ") || item.workCode,
      },
      { key: "unitCount", label: "数量", width: "10%", align: "right", render: (item) => String(item.unitCount) },
      { key: "workMinutes", label: "作業分", width: "12%", align: "right", render: (item) => String(item.workMinutes) },
      { key: "laborMinutes", label: "工数分", width: "12%", align: "right", render: (item) => String(item.laborMinutes) },
      { key: "remarks", label: "備考", width: "20%", render: (item) => item.remarks ?? "-" },
    ];
  }

  return [
    { key: "workDate", label: "作業日", width: "14%", render: (item) => item.workDate },
    {
      key: "description",
      label: "請求明細",
      width: "38%",
      render: (item) => [item.workCode, item.carType].filter(Boolean).join(" / ") || item.workCode,
    },
    { key: "unitCount", label: "数量", width: "10%", align: "right", render: (item) => String(item.unitCount) },
    { key: "salesAmount", label: "金額", width: "18%", align: "right", render: (item) => formatCurrency(item.salesAmount) },
    { key: "remarks", label: "備考", width: "20%", render: (item) => item.remarks ?? "-" },
  ];
}

function buildPages(selection: InvoiceSelectionData, documentTypes: InvoiceDocumentType[]) {
  const pages: PdfPageData[] = [];

  for (const documentType of documentTypes) {
    for (const group of selection.groups) {
      const chunks = chunkItems(group.items, getRowsPerPage(documentType));

      chunks.forEach((rows, index) => {
        pages.push({
          documentType,
          group,
          rows,
          sectionPageNumber: index + 1,
          sectionPageCount: chunks.length,
        });
      });
    }
  }

  return pages;
}

function renderGroupTotals(documentType: InvoiceDocumentType, group: InvoiceClientGroup) {
  if (documentType === "invoice") {
    return [
      ["明細件数", `${group.items.length} 件`],
      ["数量合計", `${group.totalUnitCount}`],
      ["請求金額合計", formatCurrency(group.totalSalesAmount)],
    ];
  }

  if (documentType === "delivery-note") {
    return [
      ["明細件数", `${group.items.length} 件`],
      ["数量合計", `${group.totalUnitCount}`],
      ["作業分合計", `${group.totalWorkMinutes} 分`],
      ["工数分合計", `${group.totalLaborMinutes} 分`],
    ];
  }

  return [
    ["明細件数", `${group.items.length} 件`],
    ["作業分合計", `${group.totalWorkMinutes} 分`],
    ["工数分合計", `${group.totalLaborMinutes} 分`],
    ["移動分合計", `${group.totalTravelMinutes} 分`],
  ];
}

function buildIssueDate() {
  return new Date().toISOString().slice(0, 10);
}

function alignStyle(align: ColumnDefinition["align"]) {
  if (align === "right") {
    return { textAlign: "right" as const };
  }

  if (align === "center") {
    return { textAlign: "center" as const };
  }

  return { textAlign: "left" as const };
}

function InvoicePdfDocument({
  administrator,
  documentTypes,
  selection,
}: {
  administrator: PdfAdministrator;
  documentTypes: InvoiceDocumentType[];
  selection: InvoiceSelectionData;
}) {
  const pages = buildPages(selection, documentTypes);
  const issueDate = buildIssueDate();
  const selectionPeriod = formatInvoicePeriod(selection.summary);

  return (
    <Document title="Polish-DWR Documents" author={administrator.name}>
      {pages.map((pageData, pageIndex) => {
        const columns = getColumns(pageData.documentType);
        const totals = renderGroupTotals(pageData.documentType, pageData.group);

        return (
          <Page key={`${pageData.documentType}-${pageData.group.clientCode}-${pageIndex}`} size="A4" style={styles.page}>
            <View style={styles.header}>
              <View style={styles.brandBlock}>
                <Text style={styles.label}>Polish-DWR Document Pack</Text>
                <Text style={styles.title}>{getInvoiceDocumentLabel(pageData.documentType)}</Text>
                <Text style={styles.brandTitle}>{pageData.group.clientName}</Text>
                <Text style={styles.mutedText}>得意先コード: {pageData.group.clientCode}</Text>
              </View>

              <View style={styles.metaPanel}>
                <View style={styles.metaRow}>
                  <Text style={styles.label}>発行日</Text>
                  <Text>{issueDate}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.label}>対象期間</Text>
                  <Text>{selectionPeriod}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.label}>発行者</Text>
                  <Text>{administrator.name}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.label}>連絡先</Text>
                  <Text>{administrator.email}</Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.label}>選択日報</Text>
                <Text style={styles.summaryValue}>{selection.summary.reportCount} 件</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.label}>対象得意先</Text>
                <Text style={styles.summaryValue}>{selection.summary.clientCount} 社</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.label}>売上合計</Text>
                <Text style={styles.summaryValue}>{formatCurrency(selection.summary.totalSalesAmount)}</Text>
              </View>
            </View>

            <View style={styles.sectionBand}>
              <Text style={styles.sectionBandTitle}>
                {getInvoiceDocumentLabel(pageData.documentType)} / {pageData.sectionPageNumber} / {pageData.sectionPageCount}
              </Text>
              <Text style={styles.mutedText}>選択された日報を得意先単位にまとめて出力しています。</Text>
            </View>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {columns.map((column) => (
                  <Text
                    key={column.key}
                    style={{ ...styles.cellHeader, width: column.width, ...alignStyle(column.align) }}
                  >
                    {column.label}
                  </Text>
                ))}
              </View>

              {pageData.rows.map((item, rowIndex) => (
                <View key={`${item.id}-${rowIndex}`} style={styles.tableRow}>
                  {columns.map((column) => (
                    <Text
                      key={column.key}
                      style={{ ...styles.cellBase, width: column.width, ...alignStyle(column.align) }}
                    >
                      {column.render(item)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.totalsPanel}>
              {totals.map(([label, value]) => (
                <View key={label} style={styles.totalsRow}>
                  <Text style={styles.label}>{label}</Text>
                  <Text>{value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.footer}>
              <Text>{pageData.group.clientName}</Text>
              <Text
                render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                fixed
              />
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

export async function renderInvoicePdfBuffer({
  administrator,
  documentTypes,
  selection,
}: {
  administrator: PdfAdministrator;
  documentTypes: InvoiceDocumentType[];
  selection: InvoiceSelectionData;
}) {
  ensureFontsRegistered();

  return renderToBuffer(
    <InvoicePdfDocument administrator={administrator} documentTypes={documentTypes} selection={selection} />,
  );
}