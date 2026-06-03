import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-card rounded-3xl p-8 text-center">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-teal-300" />
        <h1 className="text-2xl font-semibold">Загружаем Menarium</h1>
        <p className="mt-2 text-white/50">Готовим данные и интерфейс обмена.</p>
      </div>
    </div>
  );
}
