// GET /api/sign/[token]/webauthn — WebAuthn authentication options for signer
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { fetchDocumentByToken, resolveDocumentStatus } from "@/lib/sign/fetch-document";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const payload = await fetchDocumentByToken(token);

  if (!payload || resolveDocumentStatus(payload.document) !== "pending") {
    return NextResponse.json({ error: "Невалиден линк." }, { status: 400 });
  }

  const rpID =
    process.env.WEBAUTHN_RP_ID ??
    new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    ).hostname;

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    timeout: 60000,
  });

  return NextResponse.json(options);
}
