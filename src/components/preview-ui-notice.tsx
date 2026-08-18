export function PreviewUiNotice() {
  return (
    <div className="fixed left-0 right-0 top-20 z-50 mx-auto max-w-3xl px-4">
      <div className="rounded-xs border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-warning backdrop-blur-xl">
        <span className="font-medium">Режим предпросмотра UI:</span> база данных недоступна, показаны демо-карточки.
        Для полной логики обмена: Docker Desktop → <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">npm run preview:setup</code>
        {" "}→ <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">npm run dev</code> (см. docs/PREVIEW_LOCAL_RU.md).
      </div>
    </div>
  );
}
