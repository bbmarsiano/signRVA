// GET /api/templates/[id] — single template with fields (public for signing flow)
import { NextResponse } from "next/server";
import { fetchTemplateById } from "@/lib/templates/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await fetchTemplateById(id);

    if (!template) {
      return NextResponse.json(
        { error: "Шаблонът не е намерен." },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Template fetch error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
