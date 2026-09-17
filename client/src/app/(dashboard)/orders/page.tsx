"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusSignIcon } from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { OrderStatusBadge } from "@/components/status-badge";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Order, Product, OrderStatus } from "@/types";

interface LineItem {
  productId: string;
  quantity: string;
  unitPrice: string;
}

const STATUS_FILTERS: ("ALL" | OrderStatus)[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "IN_PRODUCTION",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // create-order dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { productId: "", quantity: "1", unitPrice: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // per-order action state
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [orders, products] = await Promise.all([
        api<Order[]>("/orders"),
        api<Product[]>("/products"),
      ]);
      setOrders(orders);
      setProducts(products);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? orders
        : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter]
  );

  const orderTotal = (order: Order) =>
    order.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );

  const draftTotal = items.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unitPrice) || 0;
    return sum + q * p;
  }, 0);

  function selectProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              productId,
              unitPrice: product ? String(product.price) : item.unitPrice,
            }
          : item
      )
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    const payloadItems = items
      .filter((i) => i.productId)
      .map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      }));

    if (
      payloadItems.length === 0 ||
      payloadItems.some(
        (i) => !Number.isInteger(i.quantity) || i.quantity <= 0 || i.unitPrice <= 0
      )
    ) {
      toast.error("Each line needs a product, a positive whole quantity and a positive price");
      return;
    }

    setSubmitting(true);
    try {
      await api("/orders", {
        method: "POST",
        body: { customerName: customerName.trim(), items: payloadItems },
      });
      toast.success("Order created", {
        description: "Confirm it to deduct stock and record the ledger entries.",
      });
      setCreateOpen(false);
      setCustomerName("");
      setItems([{ productId: "", quantity: "1", unitPrice: "" }]);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(order: Order) {
    setConfirmingId(order.id);
    try {
      await api(`/orders/${order.id}/confirm`, { method: "PATCH" });
      toast.success(`Order for ${order.customerName} confirmed`, {
        description: "Stock deducted, ledger entries recorded.",
      });
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to confirm order");
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Create orders and confirm them — confirmation deducts stock, writes the finance ledger and queues production."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <Button onClick={() => setCreateOpen(true)}>
              <HugeiconsIcon icon={PlusSignIcon} size={16} />
              New order
            </Button>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>New order</DialogTitle>
                <DialogDescription>
                  Add one or more line items. The order starts in PENDING.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer name</Label>
                  <Input
                    id="customer"
                    placeholder="Sharma Auto Interiors"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>Line items</Label>
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_5rem_6.5rem] items-end gap-2 sm:grid-cols-[1fr_5rem_7rem_2rem]"
                    >
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Product</Label>
                        <Select
                          value={item.productId || undefined}
                          onValueChange={(v) => selectProduct(index, v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.sku} — {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it, i) =>
                                i === index ? { ...it, quantity: e.target.value } : it
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Unit ₹</Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it, i) =>
                                i === index ? { ...it, unitPrice: e.target.value } : it
                              )
                            )
                          }
                        />
                      </div>
                      {items.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          onClick={() =>
                            setItems((prev) => prev.filter((_, i) => i !== index))
                          }
                          aria-label="Remove line"
                        >
                          ×
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setItems((prev) => [
                        ...prev,
                        { productId: "", quantity: "1", unitPrice: "" },
                      ])
                    }
                  >
                    <HugeiconsIcon icon={PlusSignIcon} size={14} />
                    Add line
                  </Button>
                </div>

                <div className="text-right text-sm font-medium">
                  Total: {formatCurrency(draftTotal)}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating…" : "Create order"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "ALL" ? "All statuses" : s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground ml-auto text-sm">
              {filtered.length} order{filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No orders found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-muted-foreground text-xs">
                        by {order.createdBy?.name ?? "unknown"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(orderTotal(order))}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === "PENDING" ? (
                          <Button
                            size="sm"
                            disabled={confirmingId === order.id}
                            onClick={() => handleConfirm(order)}
                          >
                            {confirmingId === order.id ? "Confirming…" : "Confirm"}
                          </Button>
                        ) : null}
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="sm:max-w-md">
                            <SheetHeader>
                              <SheetTitle>Order — {order.customerName}</SheetTitle>
                              <SheetDescription>
                                Placed {formatDateTime(order.createdAt)} by{" "}
                                {order.createdBy?.name ?? "unknown"}
                              </SheetDescription>
                            </SheetHeader>
                            <div className="space-y-4 px-4 pb-6">
                              <OrderStatusBadge status={order.status} />
                              <Separator />
                              <div className="space-y-3">
                                {order.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-start justify-between text-sm"
                                  >
                                    <div>
                                      <div className="font-medium">
                                        {item.product?.name ?? item.productId}
                                      </div>
                                      <div className="text-muted-foreground text-xs">
                                        {item.product?.sku} · {item.quantity} ×{" "}
                                        {formatCurrency(item.unitPrice)}
                                      </div>
                                    </div>
                                    <div className="font-medium">
                                      {formatCurrency(
                                        Number(item.unitPrice) * item.quantity
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <Separator />
                              <div className="flex items-center justify-between font-semibold">
                                <span>Total</span>
                                <span>{formatCurrency(orderTotal(order))}</span>
                              </div>
                            </div>
                          </SheetContent>
                        </Sheet>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
