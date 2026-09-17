import { cn } from "@/lib/utils";
import type { OrderStatus, WorkOrderStatus, LedgerAccount } from "@/types";

const ORDER_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  CONFIRMED: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  IN_PRODUCTION: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  DISPATCHED: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  DELIVERED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  CANCELLED: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        ORDER_STYLES[status]
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const completed = status === "COMPLETED";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        completed
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
      )}
    >
      {status}
    </span>
  );
}

const ACCOUNT_STYLES: Record<LedgerAccount, string> = {
  REVENUE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  ACCOUNTS_RECEIVABLE: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  CASH: "bg-lime-500/15 text-lime-700 dark:text-lime-400 border-lime-500/30",
  COGS: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  INVENTORY_VALUE: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
};

export function AccountBadge({ account }: { account: LedgerAccount }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        ACCOUNT_STYLES[account]
      )}
    >
      {account.replace(/_/g, " ")}
    </span>
  );
}
