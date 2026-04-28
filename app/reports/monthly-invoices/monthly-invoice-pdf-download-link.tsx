import { buildMonthlyInvoicePdfUrl } from "@/lib/monthly-invoice-documents";

type MonthlyInvoicePdfDownloadLinkProps = {
  month: string;
  label: string;
  className: string;
  disabled?: boolean;
};

export function MonthlyInvoicePdfDownloadLink({
  month,
  label,
  className,
  disabled = false,
}: MonthlyInvoicePdfDownloadLinkProps) {
  if (disabled) {
    return (
      <span aria-disabled="true" className={className}>
        {label}
      </span>
    );
  }

  return (
    <a className={className} href={buildMonthlyInvoicePdfUrl(month)}>
      {label}
    </a>
  );
}