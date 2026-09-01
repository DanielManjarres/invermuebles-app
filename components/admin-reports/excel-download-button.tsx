"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type ExcelDownloadButtonProps = {
  disabled?: boolean;
  onDownload: () => Promise<void>;
};

export function ExcelDownloadButton({
  disabled = false,
  onDownload,
}: ExcelDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      className="secondaryButton"
      disabled={disabled || downloading}
      type="button"
      onClick={handleDownload}
    >
      <Download size={18} />
      {downloading ? "Generando…" : "Descargar Excel"}
    </button>
  );
}
