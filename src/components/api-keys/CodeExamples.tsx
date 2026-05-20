// CodeExamples — REST API integration samples (JS / PHP / Python)
"use client";

import { useState } from "react";

const TABS = ["javascript", "php", "python"] as const;

export default function CodeExamples({ baseUrl }: { baseUrl: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("javascript");

  const examples: Record<(typeof TABS)[number], string> = {
    javascript: `const res = await fetch('${baseUrl}/api/v1/documents', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_YOUR_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Договор за наем',
    recipient_email: 'client@example.com',
    recipient_name: 'Иван Петров',
    recipient_phone: '+359888123456',
    ttl_hours: 48,
    biometric_required: true,
    pdf_base64: 'BASE64_PDF_HERE',
  }),
});
const data = await res.json();
console.log(data.sign_url, data.qr_url);`,
    php: `<?php
$ch = curl_init('${baseUrl}/api/v1/documents');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer sk_live_YOUR_KEY',
    'Content-Type: application/json',
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'title' => 'Договор за наем',
    'recipient_email' => 'client@example.com',
    'recipient_name' => 'Иван Петров',
    'ttl_hours' => 48,
    'pdf_base64' => base64_encode(file_get_contents('contract.pdf')),
  ]),
  CURLOPT_RETURNTRANSFER => true,
]);
$response = json_decode(curl_exec($ch), true);`,
    python: `import requests, base64

with open("contract.pdf", "rb") as f:
    pdf_b64 = base64.b64encode(f.read()).decode()

res = requests.post(
    "${baseUrl}/api/v1/documents",
    headers={"Authorization": "Bearer sk_live_YOUR_KEY"},
    json={
        "title": "Договор за наем",
        "recipient_email": "client@example.com",
        "recipient_name": "Иван Петров",
        "ttl_hours": 48,
        "pdf_base64": pdf_b64,
    },
)
data = res.json()
print(data["sign_url"])`,
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex border-b border-zinc-100">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize ${
              tab === t
                ? "border-b-2 text-[#085041]"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
            style={tab === t ? { borderColor: "#0F6E56" } : undefined}
          >
            {t === "javascript" ? "JavaScript" : t === "php" ? "PHP" : "Python"}
          </button>
        ))}
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-800">
        <code>{examples[tab]}</code>
      </pre>
    </div>
  );
}
