"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  TruckIcon,
  PackageIcon,
  Clock01Icon,
  InvoiceIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import {
  OrderStatusBadge,
  AccountBadge,
  StockMovementBadge,
} from "@/components/status-badge";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { OrderDetail, OrderStatus } from "@/types";

const STEPS: { status: OrderStatus; label: string; icon: any }[] = [
  { status: "PENDING", label: "Placed", icon: Clock01Icon },
  { status: "CONFIRMED", label: "Confirmed", icon: CheckmarkCircle02Icon },
  { status: "IN_PRODUCTION", label: "In Production", icon: PackageIcon },
  { status: "DISPATCHED", label: "Dispatched", icon: TruckIcon },
  { status: "DELIVERED", label: "Delivered", icon: CheckmarkCircle02Icon },
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await api<OrderDetail>(`/orders/${orderId}`);
      setOrder(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(endpoint: "confirm" | "dispatch" | "deliver" | "cancel") {
    if (!order) return;
    setActionInProgress(endpoint);
    try {
      await api(`/orders/${order.id}/${endpoint}`, { method: "PATCH" });
      toast.success(`Order ${endpoint}ed successfully`);
      if (endpoint === "cancel") {
        setCancelDialogOpen(false);
      }
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Failed to ${endpoint} order`);
    } finally {
      setActionInProgress(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold">Order not found</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          The requested order does not exist or you do not have permission to view it.
        </p>
        <Button asChild className="mt-6">
          <Link href="/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  const totalAmount = order.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0
  );

  const isCancelled = order.status === "CANCELLED";
  const stepOrder = ["PENDING", "CONFIRMED", "IN_PRODUCTION", "DISPATCHED", "DELIVERED"];
  const currentStepIndex = stepOrder.indexOf(order.status);

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 h-8 text-muted-foreground">
          <Link href="/orders">
            <HugeiconsIcon icon={ArrowLeftIcon} size={16} />
            Back to Orders
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Order #${order.id.slice(0, 8).toUpperCase()}`}
        description={`Placed on ${formatDateTime(order.createdAt)} by ${order.createdBy?.name ?? "Staff"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />

            {order.status === "PENDING" && (
              <Button
                size="sm"
                onClick={() => handleAction("confirm")}
                disabled={actionInProgress === "confirm"}
                className="h-9 shadow-sm"
              >
                {actionInProgress === "confirm" ? "Confirming…" : "Confirm Order"}
              </Button>
            )}

            {(order.status === "CONFIRMED" || order.status === "IN_PRODUCTION") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("dispatch")}
                disabled={actionInProgress === "dispatch"}
                className="h-9 border-border/60"
              >
                <HugeiconsIcon icon={TruckIcon} size={15} />
                {actionInProgress === "dispatch" ? "Dispatching…" : "Dispatch Order"}
              </Button>
            )}

            {order.status === "DISPATCHED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("deliver")}
                disabled={actionInProgress === "deliver"}
                className="h-9 border-border/60 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} />
                {actionInProgress === "deliver" ? "Delivering…" : "Mark as Delivered"}
              </Button>
            )}

            {!isCancelled && order.status !== "DISPATCHED" && order.status !== "DELIVERED" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCancelDialogOpen(true)}
                disabled={actionInProgress === "cancel"}
                className="h-9 text-destructive hover:bg-destructive/10"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
                Cancel Order
              </Button>
            )}
          </div>
        }
      />

      {/* Lifecycle Progress Stepper */}
      <Card className="border-border/60 bg-background/95 shadow-sm overflow-hidden">
        <CardContent className="pt-6">
          {isCancelled ? (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
              <HugeiconsIcon icon={Cancel01Icon} size={20} />
              <div>
                <p className="font-semibold text-sm">Order Cancelled</p>
                <p className="text-xs opacity-90">
                  This order was cancelled prior to dispatch.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative flex flex-col sm:flex-row justify-between gap-4">
              {STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;
                return (
                  <div key={step.status} className="flex-1 flex flex-row sm:flex-col items-center gap-3 text-center">
                    <div
                      className={`size-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                        isCurrent
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow"
                          : isPassed
                          ? "bg-primary/20 text-primary border border-primary/40"
                          : "bg-muted text-muted-foreground border border-border/60"
                      }`}
                    >
                      <HugeiconsIcon icon={step.icon} size={18} />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${isPassed ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {isCurrent ? "Current stage" : isPassed ? "Completed" : "Pending"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Grid: Details, Items, Ledger, Stocks */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Items Table */}
          <Card className="border-border/60 bg-background/95 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Ordered Products</CardTitle>
                <CardDescription>Line items included in this order</CardDescription>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {order.items.length} item{order.items.length === 1 ? "" : "s"}
              </span>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="h-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">SKU</TableHead>
                    <TableHead className="h-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Product</TableHead>
                    <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Qty</TableHead>
                    <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Unit Price</TableHead>
                    <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => {
                    const subtotal = Number(item.unitPrice) * item.quantity;
                    return (
                      <TableRow key={item.id} className="transition-colors hover:bg-muted/10">
                        <TableCell className="font-mono text-xs py-3">{item.product?.sku ?? "—"}</TableCell>
                        <TableCell className="font-medium text-sm py-3">
                          <Link
                            href={`/products/${item.productId}`}
                            className="hover:underline text-primary"
                          >
                            {item.product?.name ?? "Product Details"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right text-sm py-3">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm py-3">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-semibold text-sm py-3">{formatCurrency(subtotal)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 flex justify-end border-t border-border/60 pt-4">
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Total Order Value:</span>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Movement Deductions */}
          <Card className="border-border/60 bg-background/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <HugeiconsIcon icon={PackageIcon} size={18} className="text-primary" />
                Inventory Deductions (Stock Ledger)
              </CardTitle>
              <CardDescription>
                Append-only stock ledger entries created automatically when this order was confirmed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {order.stockMovements && order.stockMovements.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60">
                      <TableHead className="h-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Movement</TableHead>
                      <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Quantity</TableHead>
                      <TableHead className="h-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Note / Reference</TableHead>
                      <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.stockMovements.map((movement) => (
                      <TableRow key={movement.id} className="transition-colors hover:bg-muted/10">
                        <TableCell className="py-2.5">
                          <StockMovementBadge type={movement.type} />
                        </TableCell>
                        <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400 py-2.5">
                          {movement.quantity}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5">
                          {movement.note ?? "Automatic reservation"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground py-2.5">
                          {formatDateTime(movement.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {order.status === "PENDING"
                    ? "Confirm this order to deduct product quantities from inventory."
                    : "No stock movement ledger records found."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Financial Double-Entry Records */}
          <Card className="border-border/60 bg-background/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <HugeiconsIcon icon={InvoiceIcon} size={18} className="text-emerald-500" />
                Financial Ledger Entries
              </CardTitle>
              <CardDescription>
                Double-entry journal records posted upon order confirmation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {order.ledgerEntries && order.ledgerEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60">
                      <TableHead className="h-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Account</TableHead>
                      <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Debit (₹)</TableHead>
                      <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Credit (₹)</TableHead>
                      <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.ledgerEntries.map((entry) => (
                      <TableRow key={entry.id} className="transition-colors hover:bg-muted/10">
                        <TableCell className="py-2.5">
                          <AccountBadge account={entry.account} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm py-2.5">
                          {Number(entry.debit) > 0 ? formatCurrency(entry.debit) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm py-2.5">
                          {Number(entry.credit) > 0 ? formatCurrency(entry.credit) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground py-2.5">
                          {formatDateTime(entry.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {order.status === "PENDING"
                    ? "Financial entries will be posted (Debit Accounts Receivable, Credit Revenue) when confirmed."
                    : "No ledger entries recorded."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col) - Order Summary Dossier */}
        <div className="space-y-6">
          <Card className="border-border/60 bg-background/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Customer & Dossier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Customer Name</span>
                <p className="font-semibold text-base">{order.customerName}</p>
              </div>
              <Separator />
              <div>
                <span className="text-xs text-muted-foreground">Created By</span>
                <p className="font-medium">{order.createdBy?.name ?? "Staff Member"}</p>
                <p className="text-xs text-muted-foreground">{order.createdBy?.email}</p>
              </div>
              <Separator />
              <div>
                <span className="text-xs text-muted-foreground">Order ID</span>
                <p className="font-mono text-xs break-all">{order.id}</p>
              </div>
              <Separator />
              <div>
                <span className="text-xs text-muted-foreground">Timeline</span>
                <div className="mt-1 space-y-1 text-xs">
                  <p>
                    <span className="text-muted-foreground">Placed:</span> {formatDateTime(order.createdAt)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Updated:</span> {formatDateTime(order.updatedAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lines Count</span>
                <span className="font-medium">{order.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Units Total</span>
                <span className="font-medium">
                  {order.items.reduce((s, i) => s + i.quantity, 0)} units
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Status</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Grand Total</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md border-border/60 bg-background/95 shadow-xl">
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order for{" "}
              <strong>{order.customerName}</strong>? This action cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="border-border/60"
            >
              Keep Order
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleAction("cancel")}
              disabled={actionInProgress === "cancel"}
            >
              {actionInProgress === "cancel" ? "Cancelling…" : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
