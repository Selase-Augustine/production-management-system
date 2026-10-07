import { readFileSync } from "fs";
import { importWorkbook } from "../lib/import/excel";
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "manager@example.com" } });
  const buf = readFileSync("data/sample-production-import.xlsx");
  const s = await importWorkbook(buf, user.id);
  console.log(JSON.stringify(s, null, 2));
  await prisma.$disconnect();
}

main();
