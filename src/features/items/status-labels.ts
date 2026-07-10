import { ItemStatus, SwapStatus } from "@prisma/client";

export const itemStatusLabels: Record<ItemStatus, string> = {
  ACTIVE: "Активно",
  IN_DEAL: "В сделке",
  ARCHIVED: "Архив",
};

export const swapStatusLabels: Record<SwapStatus, string> = {
  PENDING: "Ожидает",
  ACCEPTED: "Принят",
  DECLINED: "Отклонён",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};
