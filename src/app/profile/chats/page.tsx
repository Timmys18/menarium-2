import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { GlassCard } from "@/components/menarium/card";

const chats = [
  { id: "c1", title: "Мария К.", context: "Обмен · MacBook Air M2", href: "/exchange?swap=sw-demo-1", unread: 2 },
  { id: "c2", title: "Дмитрий П.", context: "Объявление · Canon AE-1", href: "/item/demo-2?thread=demo", unread: 0 },
  { id: "c3", title: "Анна С.", context: "Обмен · Vinyl Collection", href: "/exchange?swap=sw-demo-3", unread: 1 },
];

export default function ProfileChatsPage() {
  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Мои чаты</h1>
            <p className="mt-2 text-white/60">Все диалоги по обменам и объявлениям в одном месте.</p>
          </div>
          <GlassCard className="overflow-hidden">
            {chats.map((chat) => (
              <Link key={chat.id} href={chat.href} className="flex items-center gap-4 border-b border-white/[0.04] px-5 py-4 transition-colors hover:bg-white/[0.04] last:border-b-0">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/60 to-purple-500/60">
                  <MessageCircle className="h-5 w-5" />
                  {chat.unread ? <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-teal-400" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium">{chat.title}</h2>
                    {chat.unread ? <Badge variant="teal">Новое {chat.unread}</Badge> : null}
                  </div>
                  <p className="text-sm text-white/40">{chat.context}</p>
                  <p className="mt-1 truncate text-sm text-white/65">Привет! Можем обсудить детали обмена?</p>
                </div>
                <span className="text-xs text-white/30">14:32</span>
              </Link>
            ))}
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
