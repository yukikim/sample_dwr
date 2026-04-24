import { buildInvoicePdfUrl, type InvoiceDocumentType } from "@/lib/invoice-documents";

type InvoicePdfDownloadLinkProps = {
  selectedIds: string[];
  documentTypes: InvoiceDocumentType[];
  label: string;
  className: string;
  disabled?: boolean;
};

export function InvoicePdfDownloadLink({
  selectedIds,
  documentTypes,
  label,
  className,
  disabled = false,
}: InvoicePdfDownloadLinkProps) {
  if (disabled) {
    return (
      <span aria-disabled="true" className={className}>
        {label}
      </span>
    );
  }

  return (
    <a
      className={className}
      href={buildInvoicePdfUrl(selectedIds, documentTypes)}
    >
      {label}
    </a>
  );
}