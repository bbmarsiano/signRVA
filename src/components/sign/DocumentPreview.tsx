// DocumentPreview — iframe PDF preview (dashboard URL or public sign token route)
export default function DocumentPreview({
  previewUrl,
  signToken,
  title,
  refreshKey = 0,
}: {
  previewUrl?: string | null;
  signToken?: string;
  title: string;
  refreshKey?: number;
}) {
  const iframeSrc = signToken
    ? `/api/sign/${signToken}/preview?t=${refreshKey}`
    : previewUrl
      ? `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}t=${refreshKey}`
      : null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-500">Преглед на документа</p>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
        {iframeSrc ? (
          <iframe
            id="doc-preview-iframe"
            key={refreshKey}
            src={iframeSrc}
            title={title}
            className="h-[220px] w-full"
          />
        ) : (
          <div className="flex h-[220px] items-center justify-center text-sm text-zinc-500">
            Прегледът не е наличен
          </div>
        )}
      </div>
    </div>
  );
}
