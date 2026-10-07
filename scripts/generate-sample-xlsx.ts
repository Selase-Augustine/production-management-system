import ExcelJS from "exceljs";
import path from "path";

async function main() {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Records");
  sheet.addRow(["Date", "Shift", "Product", "Item Code", "Quantity", "Status", "Reason", "Remarks"]);
  sheet.addRow(["2026-08-31", "Morning", "Cowbell Coffee", "CBCF", 12.5, "PRODUCED", "", ""]);
  sheet.addRow(["2026-08-31", "Morning", "Miksi Choco", "MKCH", 8, "PRODUCED", "", ""]);
  sheet.addRow(["2026-08-31", "Afternoon", "", "", "", "NO PRODUCTION", "Power Outage", "Line down"]);
  const out = path.join(process.cwd(), "data", "sample-production-import.xlsx");
  await wb.xlsx.writeFile(out);
  console.log("Wrote", out);
}

main();
