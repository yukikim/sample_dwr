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
import { formatInvoicePeriod, invoiceIssuer, type InvoiceClientGroup, type InvoiceSelectionData } from "@/lib/invoices";

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

type PdfLineItem = {
  id: string;
  carType: string;
  identifier: string;
  purchaser: string;
  workDescription: string;
  amount: string;
  summary: string;
};

type DocumentTheme = {
  primary: string;
  soft: string;
  intro: string;
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

const A5_LANDSCAPE_SIZE = {
  width: 595.28,
  height: 419.53*2,
} as const;

const DETAIL_ROW_COUNT = 20;

let fontRegistered = false;

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingRight: 24,
    paddingBottom: 16,
    paddingLeft: 24,
    backgroundColor: "#ffffff",
    color: "#2a221d",
    fontFamily: "NotoSansJP",
    fontSize: 9,
  },
  titleWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 21,
    fontWeight: 700,
    letterSpacing: 8,
    paddingBottom: 4,
    paddingLeft: 8,
  },
  titleRule: {
    width: 164,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  recipientBlock: {
    width: "58%",
    paddingTop: 28,
  },
  recipientLine: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    paddingBottom: 5,
    paddingRight: 6,
    alignItems: "flex-start",
  },
  recipientName: {
    fontSize: 21,
    fontWeight: 700,
  },
  issuerBlock: {
    width: "34%",
    paddingTop: 6,
  },
  issuerTitle: {
    fontSize: 19,
    fontWeight: 700,
    marginBottom: 5,
  },
  issuerText: {
    fontSize: 9,
    lineHeight: 1.4,
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  dateUnit: {
    flexDirection: "row",
    width: 28,
    alignItems: "flex-end",
    marginRight: 12,
  },
  dateUnitLast: {
    flexDirection: "row",
    width: 28,
    alignItems: "flex-end",
  },
  dateLabel: {
    fontSize: 8,
    marginBottom: 1,
  },
  dateValue: {
    width: "100%",
    minHeight: 16,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    textAlign: "center",
    fontSize: 11,
  },
  codeAndIntroRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  codeBox: {
    width: 196,
    minHeight: 32,
    borderWidth: 1,
    borderStyle: "solid",
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  codeLabelCell: {
    width: 94,
    justifyContent: "center",
    paddingLeft: 8,
    fontSize: 9,
  },
  codeSplitCell: {
    width: 23,
    borderLeftWidth: 1,
    // borderLeftStyle: "dashed",
  },
  introText: {
    fontSize: 8.5,
    flexGrow: 1,
  },
  tableFrame: {
    borderWidth: 1,
    borderStyle: "solid",
  },
  tableHeader: {
    flexDirection: "row",
    minHeight: 28,
  },
  headerCell: {
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: "#ffffff",
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 4,
    paddingRight: 4,
  },
  headerCellText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: 700,
  },
  detailRow: {
    flexDirection: "row",
    height: 22,
    borderTopWidth: 1,
    borderTopStyle: "solid",
  },
  detailCell: {
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 4,
    paddingRight: 4,
    borderRightWidth: 1,
    borderRightStyle: "solid",
    justifyContent: "flex-start",
  },
  detailCellCenter: {
    alignItems: "center",
  },
  detailCellRight: {
    alignItems: "flex-end",
  },
  detailText: {
    fontSize: 7,
  },
  amountGuide: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: "row",
  },
  amountGuideLine: {
    width: 28,
    // borderLeftWidth: 1,
    // borderLeftStyle: "dashed",
  },
  bottomArea: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
  },
  bottomLeft: {
    width: "65.2%",
  },
  bottomRight: {
    width: "34.8%",
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
  },
  bottomRow: {
    flexDirection: "row",
    minHeight: 28,
    borderTopWidth: 1,
    borderTopStyle: "solid",
  },
  bottomLabelCell: {
    width: 74,
    justifyContent: "center",
    paddingLeft: 6,
    paddingRight: 6,
  },
  bottomLabelCellWide: {
    width: 108,
    justifyContent: "center",
    paddingLeft: 6,
    paddingRight: 6,
  },
  bottomValueCell: {
    flexGrow: 1,
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 6,
    paddingRight: 6,
    justifyContent: "center",
  },
  bottomValueCellAmount: {
    flexGrow: 1,
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 6,
    paddingRight: 6,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  bottomAmountGuide: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: "row",
  },
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#7a6f68",
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

function getDocumentTheme(documentType: InvoiceDocumentType): DocumentTheme {
  if (documentType === "work-slip") {
    return {
      primary: "#0ea56f",
      soft: "#dceee2",
      intro: "下記の通り受注致しました",
    };
  }

  if (documentType === "delivery-note") {
    return {
      primary: "#1468b3",
      soft: "#dbe6f4",
      intro: "下記の通り納品申し上げます",
    };
  }

  return {
    primary: "#ef3340",
    soft: "#f8ddd4",
    intro: "下記の通り御請求申し上げます",
  };
}

function buildPages(selection: InvoiceSelectionData, documentTypes: InvoiceDocumentType[]) {
  const pages: PdfPageData[] = [];

  for (const documentType of documentTypes) {
    for (const group of selection.groups) {
      const chunks = chunkItems(group.items, DETAIL_ROW_COUNT);

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

function buildIssueDateParts() {
  const now = new Date();

  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    day: String(now.getDate()),
  };
}

function buildLineItems(documentType: InvoiceDocumentType, group: InvoiceClientGroup, rows: InvoiceClientGroup["items"]): PdfLineItem[] {
  return rows.map((item) => {
    return {
      id: item.id,
      carType: item.carType ?? "",
      identifier: item.vehicleIdentifier ?? "",
      purchaser: item.purchaser ?? group.clientName,
      workDescription: item.workCode,
      amount: formatCurrency(item.salesAmount),
      summary: item.remarks ?? "",
    };
  });
}

function buildPlaceholderLineItems(count: number): PdfLineItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `placeholder-${index}`,
    carType: "",
    identifier: "",
    purchaser: "",
    workDescription: "",
    amount: "",
    summary: "",
  }));
}

function buildBottomSummaryRows(group: InvoiceClientGroup, administrator: PdfAdministrator) {
  const subtotalValue = group.totalSalesAmount;
  const taxValue = Math.floor(subtotalValue * 0.1);
  const totalValue = subtotalValue + taxValue;
  const workLocation = joinUniqueValues(group.items.map((item) => item.workLocation));
  const signerName = joinUniqueValues(group.items.map((item) => item.signerName));

  return {
    workLocation,
    workerName: administrator.name,
    signLabel: signerName,
    subtotal: formatCurrency(subtotalValue),
    tax: formatCurrency(taxValue),
    total: formatCurrency(totalValue),
  };
}

function joinUniqueValues(values: Array<string | null>) {
  const normalizedValues = Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())).map((value) => value.trim())));

  if (normalizedValues.length === 0) {
    return "-";
  }

  return normalizedValues.join(" / ");
}

function DocumentPage({
  administrator,
  pageData,
  selectionPeriod,
}: {
  administrator: PdfAdministrator;
  pageData: PdfPageData;
  selectionPeriod: string;
}) {
  const theme = getDocumentTheme(pageData.documentType);
  const issueDate = buildIssueDateParts();
  const detailItems = buildLineItems(pageData.documentType, pageData.group, pageData.rows);
  const filledItems = [...detailItems, ...buildPlaceholderLineItems(Math.max(0, DETAIL_ROW_COUNT - detailItems.length))];
  const bottomSummary = buildBottomSummaryRows(pageData.group, administrator);

  return (
    <Page size={A5_LANDSCAPE_SIZE} style={styles.page}>
      <View style={styles.titleWrap}>
        <Text style={{ ...styles.title, color: theme.primary }}>{getInvoiceDocumentLabel(pageData.documentType)}</Text>
        <View style={{ ...styles.titleRule, borderBottomColor: theme.primary }} />
      </View>

      <View style={styles.topSection}>
        <View style={styles.recipientBlock}>
          <View style={{ ...styles.recipientLine, borderBottomColor: theme.primary }}>
            <Text style={{ ...styles.recipientName, color: theme.primary }}>{pageData.group.clientName} 様</Text>
          </View>
        </View>

        <View style={styles.issuerBlock}>
          <Text style={{ ...styles.issuerTitle, color: theme.primary }}>{invoiceIssuer.companyName}</Text>
          <Text style={{ ...styles.issuerText, color: theme.primary }}>{invoiceIssuer.address}</Text>
          {/* <Text style={{ ...styles.issuerText, color: theme.primary }}>振込先 {invoiceIssuer.transferAccount}</Text> */}
        </View>
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateUnit}>
          <Text style={{ color: theme.primary }}>{issueDate.year}</Text>
          <Text style={{ ...styles.dateLabel, color: theme.primary }}>年</Text>
        </View>
        <View style={styles.dateUnit}>
          <Text style={{ color: theme.primary }}>{issueDate.month}</Text>
          <Text style={{ ...styles.dateLabel, color: theme.primary }}>月</Text>
        </View>
        <View style={styles.dateUnitLast}>
          <Text style={{ color: theme.primary }}>{issueDate.day}</Text>
          <Text style={{ ...styles.dateLabel, color: theme.primary }}>日</Text>
        </View>
      </View>

      <View style={styles.codeAndIntroRow}>
        <View style={{ ...styles.codeBox, borderColor: theme.primary }}>
          <Text style={{ ...styles.codeLabelCell, color: theme.primary }}>得意先コード</Text>
          <Text style={{ ...styles.codeLabelCell, color: theme.primary }}>{pageData.group.clientCode}</Text>
          {/* <View style={{ ...styles.codeSplitCell, borderLeftColor: theme.primary }} />
          <View style={{ ...styles.codeSplitCell, borderLeftColor: theme.primary }} />
          <View style={{ ...styles.codeSplitCell, borderLeftColor: theme.primary }} />
          <View style={{ ...styles.codeSplitCell, borderLeftColor: theme.primary }} />
          <View style={{ ...styles.codeSplitCell, borderLeftColor: theme.primary }} /> */}
        </View>
        <Text style={{ ...styles.introText, color: theme.primary }}>{theme.intro}</Text>
      </View>

      <View style={{ ...styles.tableFrame, borderColor: theme.primary }}>
        <View style={styles.tableHeader}>
          <View style={{ ...styles.headerCell, width: "10%", backgroundColor: theme.primary }}>
            <Text style={styles.headerCellText}>車　種</Text>
          </View>
          <View style={{ ...styles.headerCell, width: "14%", backgroundColor: theme.primary }}>
            <Text style={styles.headerCellText}>登録番号又は車体番号</Text>
          </View>
          <View style={{ ...styles.headerCell, width: "18%", backgroundColor: theme.primary }}>
            <Text style={styles.headerCellText}>客　名</Text>
          </View>
          <View style={{ ...styles.headerCell, width: "23%", backgroundColor: theme.primary }}>
            <Text style={styles.headerCellText}>作業内容</Text>
          </View>
          <View style={{ ...styles.headerCell, width: "12%", backgroundColor: theme.primary }}>
            <Text style={styles.headerCellText}>金　額</Text>
          </View>
          <View style={{ ...styles.headerCell, width: "23%", backgroundColor: theme.primary, borderRightWidth: 0 }}>
            <Text style={styles.headerCellText}>摘　要</Text>
          </View>
        </View>

        {filledItems.map((item, rowIndex) => (
          <View
            key={`${item.id}-${rowIndex}`}
            style={{
              ...styles.detailRow,
              borderTopColor: theme.primary,
              backgroundColor: rowIndex % 2 === 1 ? theme.soft : "#ffffff",
            }}
          >
            <View style={{ ...styles.detailCell, ...styles.detailCellCenter, width: "10%", borderRightColor: theme.primary }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>{item.carType}</Text>
            </View>
            <View style={{ ...styles.detailCell, width: "14%", borderRightColor: theme.primary }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>{item.identifier}</Text>
            </View>
            <View style={{ ...styles.detailCell, width: "18%", borderRightColor: theme.primary }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>{item.purchaser}</Text>
            </View>
            <View style={{ ...styles.detailCell, width: "23%", borderRightColor: theme.primary }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>{item.workDescription}</Text>
            </View>
            <View style={{ ...styles.detailCell, ...styles.detailCellRight, width: "12%", borderRightColor: theme.primary, position: "relative" }}>
              {/* <View style={styles.amountGuide}>
                <View style={{ ...styles.amountGuideLine, borderLeftColor: theme.primary }} />
                <View style={{ ...styles.amountGuideLine, borderLeftColor: theme.primary }} />
                <View style={{ ...styles.amountGuideLine, borderLeftColor: theme.primary }} />
              </View> */}
              <Text style={{ ...styles.detailText, color: theme.primary }}>{item.amount}</Text>
            </View>
            <View style={{ ...styles.detailCell, width: "23%", borderRightWidth: 0 }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>{item.summary}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ ...styles.bottomArea, borderLeftColor: theme.primary, borderRightColor: theme.primary, borderBottomColor: theme.primary }}>
        <View style={styles.bottomLeft}>
          <View style={{ ...styles.bottomRow, borderTopWidth: 0 }}>
            <View style={{ ...styles.bottomLabelCell, width: "20%", backgroundColor: theme.soft }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>作業場所</Text>
            </View>
            <View style={{ ...styles.bottomValueCell, width: "47%", borderLeftColor: theme.primary }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>{bottomSummary.workLocation}</Text>
            </View>
            <View style={{ ...styles.bottomLabelCellWide, width: "13%", borderLeftWidth: 1, borderLeftStyle: "solid", borderLeftColor: theme.primary, backgroundColor: theme.primary }}>
              <Text style={{ ...styles.detailText, color: "#ffffff" }}>担当者(サイン)</Text>
            </View>
            <View style={{ ...styles.bottomValueCell, width: "20%", borderLeftColor: theme.primary }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>{bottomSummary.signLabel}</Text>
            </View>
          </View>

          <View style={{ ...styles.bottomRow, borderTopColor: theme.primary }}>
            <View style={{ ...styles.bottomLabelCell, width: "20%", backgroundColor: theme.soft }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>記入者(作業者)</Text>
            </View>
            <View style={{ ...styles.bottomValueCell, width: "47%", borderLeftColor: theme.primary }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>{bottomSummary.workerName}</Text>
            </View>
            <View style={{ ...styles.bottomLabelCellWide, width: "13%", borderLeftWidth: 1, borderLeftStyle: "solid", borderLeftColor: theme.primary, backgroundColor: theme.soft }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>消費税(10%)</Text>
            </View>
            <View style={{ ...styles.bottomValueCellAmount, width: "20%", borderLeftColor: theme.primary, position: "relative" }}>
              <View style={styles.bottomAmountGuide}>
                <View style={{ ...styles.amountGuideLine, borderLeftColor: theme.primary }} />
                <View style={{ ...styles.amountGuideLine, borderLeftColor: theme.primary }} />
                <View style={{ ...styles.amountGuideLine, borderLeftColor: theme.primary }} />
              </View>
              <Text style={{ ...styles.detailText, color: theme.primary }}>{bottomSummary.tax}</Text>
            </View>
          </View>
        </View>

        <View style={{ ...styles.bottomRight, borderLeftColor: theme.primary }}>
          <View style={{ ...styles.bottomRow, borderTopWidth: 0 }}>
            <View style={{ ...styles.bottomLabelCellWide, width: "35%", backgroundColor: theme.soft }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>10%対象小計</Text>
            </View>
            <View style={{ ...styles.bottomValueCellAmount, width: "65%", borderLeftColor: theme.primary, position: "relative" }}>
              <View style={styles.bottomAmountGuide}>
                <View style={{ ...styles.amountGuideLine, borderLeftColor: theme.primary }} />
                <View style={{ ...styles.amountGuideLine, borderLeftColor: theme.primary }} />
                <View style={{ ...styles.amountGuideLine, borderLeftColor: theme.primary }} />
              </View>
              <Text style={{ ...styles.detailText, color: theme.primary }}>{bottomSummary.subtotal}</Text>
            </View>
          </View>

          <View style={{ ...styles.bottomRow, borderTopColor: theme.primary }}>
            <View style={{ ...styles.bottomLabelCellWide, width: "35%", backgroundColor: theme.soft }}>
              <Text style={{ ...styles.detailText, color: theme.primary }}>合計金額</Text>
            </View>
            <View style={{ ...styles.bottomValueCellAmount, width: "65%", borderLeftColor: theme.primary, position: "relative" }}>
              {/* <View style={styles.bottomAmountGuide}>
                <View style={{ ...styles.amountGuideLine, borderLeftColor: theme.primary }} />
                <View style={{ ...styles.amountGuideLine, borderLeftColor: theme.primary }} />
                <View style={{ ...styles.amountGuideLine, borderLeftColor: theme.primary }} />
              </View> */}
              <Text style={{ ...styles.detailText, color: theme.primary }}>{bottomSummary.total}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>{pageData.group.clientCode} / {selectionPeriod}</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages} | 帳票 ${pageData.sectionPageNumber} / ${pageData.sectionPageCount}`} fixed />
      </View>
    </Page>
  );
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
  const selectionPeriod = formatInvoicePeriod(selection.summary);

  return (
    <Document title="Polish-DWR Documents" author={administrator.name}>
      {pages.map((pageData, pageIndex) => (
        <DocumentPage
          key={`${pageData.documentType}-${pageData.group.clientCode}-${pageIndex}`}
          administrator={administrator}
          pageData={pageData}
          selectionPeriod={selectionPeriod}
        />
      ))}
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
