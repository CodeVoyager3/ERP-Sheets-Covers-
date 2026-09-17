import { cn } from "@/lib/utils";
import type { OrderStatus, WorkOrderStatus, LedgerAccount } from "@/types";

const ORDER_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
  CONFIRMED: "bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400",
  IN_PRODUCTION: "bg-violet-600/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400",
  DISPATCHED: "bg-cyan-600/10 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-400",
  DELIVERED: "bg-emerald-600/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
  CANCELLED: "bg-red-600/10 text-red-600 dark:bg-red-400/10 dark:text-red-400",
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        completed
          ? "bg-emerald-600/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 border-emerald-500/30"
          : "bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 border-amber-500/30"
      )}
    >
      {status}
    </span>
  );
}

const ACCOUNT_STYLES: Record<LedgerAccount, string> = {
  REVENUE: "bg-emerald-600/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 border-emerald-500/30",
  ACCOUNTS_RECEIVABLE: "bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400 border-blue-500/30",
  CASH: "bg-lime-600/10 text-lime-700 dark:bg-lime-400/10 dark:text-lime-400 border-lime-500/30",
  COGS: "bg-orange-600/10 text-orange-600 dark:bg-orange-400/10 dark:text-orange-400 border-orange-500/30",
  INVENTORY_VALUE: "bg-violet-600/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400 border-violet-500/30",
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

import type { ProductionStage, StockMovementType } from "@/types";

const STAGE_STYLES: Record<ProductionStage, string> = {
  QUEUED: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
  CUTTING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  STITCHING: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  QUALITY_CHECK: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

export function ProductionStageBadge({ stage }: { stage: ProductionStage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STAGE_STYLES[stage]
      )}
    >
      {stage.replace(/_/g, " ")}
    </span>
  );
}

const MOVEMENT_STYLES: Record<StockMovementType, string> = {
  STOCK_IN: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  STOCK_OUT: "bg-rose-600/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  ADJUSTMENT: "bg-amber-600/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  PRODUCTION_YIELD: "bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
};

export function StockMovementBadge({ type }: { type: StockMovementType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        MOVEMENT_STYLES[type]
      )}
    >
      {type.replace(/_/g, " ")}
    </span>
  );
}

