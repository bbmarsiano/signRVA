// New document — 4-step upload wizard to create and send a signing request
import UploadWizard from "@/components/documents/UploadWizard";

export default function NewDocumentPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-zinc-900">Нов документ</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Качете PDF, попълнете получател и изпратете линк за подписване
        </p>
      </div>
      <UploadWizard />
    </div>
  );
}
