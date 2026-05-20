// DocumentPreview — iframe PDF preview via Supabase signed URL
export default function DocumentPreview({
  previewUrl,
  title,
}: {
  previewUrl: string | null;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-500">Преглед на документа</p>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
        {previewUrl ? (
          <iframe
            src={previewUrl}
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
