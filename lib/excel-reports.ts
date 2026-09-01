"use client";

export type ExcelColumn = {
  header: string;
  key: string;
  width?: number;
  numberFormat?: string;
};

export type ExcelRow = Record<string, boolean | Date | number | string | null>;

export type ExcelSheet = {
  columns: ExcelColumn[];
  name: string;
  rows: ExcelRow[];
};

type ExcelReport = {
  fileName: string;
  sheets: ExcelSheet[];
};

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

export function reportDateSuffix(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function downloadExcelReport({ fileName, sheets }: ExcelReport) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Invermuebles del Quindío";
  workbook.created = new Date();
  workbook.modified = new Date();

  sheets.forEach((sheetDefinition) => {
    const worksheet = workbook.addWorksheet(sheetDefinition.name, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    worksheet.columns = sheetDefinition.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width ?? 18,
      style: column.numberFormat ? { numFmt: column.numberFormat } : undefined,
    }));
    worksheet.addRows(sheetDefinition.rows);
    worksheet.autoFilter = {
      from: { column: 1, row: 1 },
      to: { column: sheetDefinition.columns.length, row: 1 },
    };
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF00652E" },
      };
      cell.alignment = { vertical: "middle" };
    });
    worksheet.getRow(1).height = 24;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.alignment = { vertical: "top", wrapText: true };
      if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF1F6EF" },
          };
        });
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(fileName)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
