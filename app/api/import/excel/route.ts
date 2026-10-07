import { getSession } from "@/lib/auth/session";
import { importWorkbook } from "@/lib/import/excel";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose an Excel workbook." }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const summary = await importWorkbook(buffer, session.id);
    return Response.json(summary);
  } catch {
    return Response.json({ error: "Unable to read the workbook. Check the file format." }, { status: 400 });
  }
}
