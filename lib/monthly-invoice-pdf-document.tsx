import path from "node:path";

import {
    Document,
    Font,
    Image,
    Page,
    StyleSheet,
    Text,
    View,
} from "@react-pdf/renderer";

import type { InvoicePdfFontSources } from "@/lib/invoice-pdf-document";
import { invoiceIssuer } from "@/lib/invoice-shared";
import type { MonthlyInvoiceClientGroup, MonthlyInvoiceData, MonthlyInvoiceLineItem } from "@/lib/monthly-invoices";

export type MonthlyInvoicePdfAdministrator = {
    name: string;
    email: string;
};

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
});

const POLISH_STAMP_IMAGE_PATH = path.join(process.cwd(), "public", "polish-stamp.png");
const STAMP_WIDTH = 59.6;

const ROWS_PER_PAGE = 30;

let fontRegistered = false;

const styles = StyleSheet.create({
    page: {
        paddingTop: 44,
        paddingRight: 38,
        paddingBottom: 38,
        paddingLeft: 38,
        backgroundColor: "#ffffff",
        color: "#111111",
        fontFamily: "NotoSansJP",
        fontSize: 10,
    },
    titleWrap: {
        alignItems: "center",
        marginBottom: 38,
    },
    title: {
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: 1,
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 24,
    },
    recipientBlock: {
        width: "58%",
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: "#d0d0d0",
    },
    issuerBlock: {
        width: "37%",
        alignItems: "flex-end",
        position: "relative",
        paddingRight: 10,
    },
    issuerTitleWrap: {
        position: "relative",
        width: "100%",
        minHeight: 50,
        alignItems: "flex-end",
        justifyContent: "flex-start",
    },
    blockLabel: {
        fontSize: 9,
        color: "#444444",
        marginBottom: 4,
    },
    recipientName: {
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1.2,
    },
    issuerTitle: {
        fontSize: 12,
        fontWeight: 500,
        marginBottom: 6,
        paddingRight: 60,
        position: "relative",
        zIndex: 1,
    },
    stampImage: {
        position: "absolute",
        top: -14,
        right: 0,
        width: STAMP_WIDTH,
        height: STAMP_WIDTH,
        opacity: 0.92,
    },
    issuerLine: {
        fontSize: 9,
        lineHeight: 1.45,
        marginBottom: 2,
    },
    monthLabel: {
        fontSize: 18,
        fontWeight: 700,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 700,
        marginBottom: 10,
    },
    summaryTable: {
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#d0d0d0",
        marginBottom: 16,
    },
    summaryRowSmall: {
        flexDirection: "row",
        minHeight: 22,
        borderTopWidth: 1,
        borderTopStyle: "solid",
        borderTopColor: "#d0d0d0",
    },
    summaryRow: {
        flexDirection: "row",
        minHeight: 32,
        borderTopWidth: 1,
        borderTopStyle: "solid",
        borderTopColor: "#d0d0d0",
    },
    summaryRowFirst: {
        borderTopWidth: 0,
    },
    summaryLabelCellSmall: {
        width: "27%",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#d0d0d0",
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
        justifyContent: "center",
        paddingTop: 4,
        paddingRight: 10,
        paddingBottom: 4,
        paddingLeft: 10,
    },
    summaryLabelCell: {
        width: "27%",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#d0d0d0",
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
        justifyContent: "center",
        paddingTop: 6,
        paddingRight: 10,
        paddingBottom: 6,
        paddingLeft: 10,
    },
    summaryValueCellSmall: {
        width: "73%",
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        justifyContent: "center",
        alignItems: "flex-end",
        paddingTop: 4,
        paddingRight: 14,
        paddingBottom: 4,
        paddingLeft: 10,
    },
    summaryValueCell: {
        width: "73%",
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        justifyContent: "center",
        alignItems: "flex-end",
        paddingTop: 6,
        paddingRight: 14,
        paddingBottom: 6,
        paddingLeft: 10,
    },
    summaryTextSmall: {
        fontSize: 8,
        color: "#444444",
    },
    summaryText: {
        fontSize: 10,
        color: "#444444",
    },
    summaryAmountSmall: {
        fontSize: 8,
        color: "#444444",
    },
    summaryAmount: {
        fontSize: 10,
        color: "#444444",
        fontWeight: 700,
    },
    tableWrap: {
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#d0d0d0",
    },
    dropdownRow: {
        width: 300,
        fontSize: 8,
        flexDirection: "row",
        marginBottom: 2,
        borderBottom: "1px solid #d0d0d0",
    },
    spaceWork: {
        width: 140,
    },
    spaceUnitNumber: {
        width: 40,
    },
    spaceUnitAmount: {
        width: 100,
        textAlign: "right",
    },
    tableHeader: {
        flexDirection: "row",
        minHeight: 30,
    },
    tableHeaderCell: {
        paddingTop: 6,
        paddingRight: 8,
        paddingBottom: 6,
        paddingLeft: 8,
        fontSize: 10,
        fontWeight: 700,
        borderRightWidth: 1,
        borderRightStyle: "solid",
        borderRightColor: "#d0d0d0",
        justifyContent: "center",
        textAlign: "center",
    },
    workCodeCell: {
        width: "51%",
    },
    unitCountCell: {
        width: "20%",
        textAlign: "center",
        alignItems: "center",
    },
    amountCell: {
        width: "29%",
        textAlign: "right",
        alignItems: "flex-end",
        borderRightWidth: 0,
    },
    tableRow: {
        flexDirection: "row",
        minHeight: 28,
        borderTopWidth: 1,
        borderTopStyle: "solid",
        borderTopColor: "#d0d0d0",
    },
    tableCell: {
        paddingTop: 5,
        paddingRight: 8,
        paddingBottom: 5,
        paddingLeft: 8,
        borderRightWidth: 1,
        borderRightStyle: "solid",
        borderRightColor: "#d0d0d0",
        justifyContent: "center",
    },
    tableCellText: {
        fontSize: 9,
        color: "#444444",
    },
    tableCellMuted: {
        color: "#ffffff",
    },
    issueDate: {
        marginTop: 12,
        fontSize: 9,
        color: "#444444",
        textAlign: "right",
    },
});

function chunkItems(items: MonthlyInvoiceLineItem[]) {
    if (items.length === 0) {
        return [[]];
    }

    const chunks: MonthlyInvoiceLineItem[][] = [];

    for (let index = 0; index < items.length; index += ROWS_PER_PAGE) {
        chunks.push(items.slice(index, index + ROWS_PER_PAGE));
    }

    return chunks;
}

function formatCurrency(value: number) {
    return currencyFormatter.format(value);
}

function sanitizePdfText(value: string) {
    return value.replace(/\r\n?/g, "\n").trim();
}

function formatIssueDate(month: string) {
    const [year, monthValue] = month.split("-").map(Number);
    const issueDate = new Date(Date.UTC(year, monthValue, 1));

    const issueYear = issueDate.getUTCFullYear();
    const issueMonth = String(issueDate.getUTCMonth() + 1).padStart(2, "0");
    const issueDay = String(issueDate.getUTCDate()).padStart(2, "0");

    return `${issueYear}年${issueMonth}月${issueDay}日`;
}

export function ensureMonthlyInvoicePdfFontsRegistered(fontSources: InvoicePdfFontSources) {
    if (fontRegistered) {
        return;
    }

    Font.register({
        family: "NotoSansJP",
        fonts: [
            {
                src: fontSources.regular.src,
                fontWeight: 400,
                postscriptName: fontSources.regular.postscriptName,
            },
            {
                src: fontSources.bold.src,
                fontWeight: 700,
                postscriptName: fontSources.bold.postscriptName,
            },
        ],
    });

    fontRegistered = true;
}

function MonthlyInvoicePage({
    group,
    items,
    monthLabel,
    month,
}: {
    group: MonthlyInvoiceClientGroup;
    items: MonthlyInvoiceLineItem[];
    monthLabel: string;
    month: string;
}) {
    const issuerCompanyName = sanitizePdfText(invoiceIssuer.companyName);
    const issuerAddress = sanitizePdfText(invoiceIssuer.address);
    const issuerPhone = sanitizePdfText(invoiceIssuer.phone);
    const recipientName = sanitizePdfText(group.clientName);
    const issueDate = formatIssueDate(month);

    return (
        <>
            <View style={styles.titleWrap}>
                <Text style={styles.title}>請求書</Text>
            </View>

            <View style={styles.metaRow}>
                <View style={styles.recipientBlock}>
                    <Text style={styles.recipientName}>{recipientName} 様</Text>
                </View>

                <View style={styles.issuerBlock}>
                    <View style={styles.issuerTitleWrap}>
                        <Image src={POLISH_STAMP_IMAGE_PATH} style={styles.stampImage} />
                        <Text style={styles.issuerTitle}>{issuerCompanyName}</Text>
                    </View>
                    <Text style={styles.issuerLine}>{issuerAddress}</Text>
                    <Text style={styles.issuerLine}>TEL {issuerPhone}</Text>
                </View>
            </View>

            <Text style={styles.monthLabel}>{monthLabel}</Text>

            <Text style={styles.sectionTitle}>請求金額</Text>

            <View style={styles.summaryTable}>
                <View style={[styles.summaryRowSmall, styles.summaryRowFirst]}>
                    <View style={styles.summaryLabelCellSmall}>
                        <Text style={styles.summaryTextSmall}>小計</Text>
                    </View>
                    <View style={styles.summaryValueCellSmall}>
                        <Text style={styles.summaryAmountSmall}>{formatCurrency(group.subtotalAmount)}</Text>
                    </View>
                </View>

                <View style={styles.summaryRowSmall}>
                    <View style={styles.summaryLabelCellSmall}>
                        <Text style={styles.summaryTextSmall}>消費税(10%)</Text>
                    </View>
                    <View style={styles.summaryValueCellSmall}>
                        <Text style={styles.summaryAmountSmall}>{formatCurrency(group.taxAmount)}</Text>
                    </View>
                </View>

                <View style={styles.summaryRow}>
                    <View style={styles.summaryLabelCell}>
                        <Text style={styles.summaryText}>合計金額</Text>
                    </View>
                    <View style={styles.summaryValueCell}>
                        <Text style={styles.summaryAmount}>{formatCurrency(group.totalAmount)}</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.blockLabel}>内訳</Text>
            {items.map((item) => (
                <View key={`${group.clientCode}-${item.workCode}`} style={styles.dropdownRow}>
                    <Text style={styles.spaceWork}>{sanitizePdfText(item.workCode)}</Text>
                    <Text style={styles.spaceUnitNumber}>{item.unitCount}台</Text>
                    <Text style={styles.spaceUnitAmount}>{formatCurrency(item.amount)}</Text>
                </View>
            ))}
            <Text style={styles.issueDate}>発行日 {issueDate}</Text>
        </>
    );
}

export function MonthlyInvoicePdfDocument({
    data,
}: {
    data: MonthlyInvoiceData;
}) {
    const pages = data.groups.flatMap((group) =>
        chunkItems(group.items).map((items, index) => ({
            group,
            items,
            key: `${group.clientCode}-${index}`,
        })),
    );

    return (
        <Document>
            {pages.map(({ group, items, key }) => (
                <Page key={key} size="A4" style={styles.page}>
                    <MonthlyInvoicePage group={group} items={items} monthLabel={data.summary.monthLabel} month={data.summary.month} />
                </Page>
            ))}
        </Document>
    );
}