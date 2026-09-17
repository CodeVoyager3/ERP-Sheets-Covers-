"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusSignIcon, TaskDoneIcon } from "@/lib/hugeicons";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { WorkOrderStatusBadge } from "@/components/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { Product, WorkOrder } from "@/types";

export default function ProductionPage() {
  const { isOwner } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: "" });
  const [completingId, setCompletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [workOrders, products] = await Promise.all([
        api<WorkOrder[]>("/production"),
        api<Product[]>("/products"),
      ]);
      setWorkOrders(workOrders);
      setProducts(products);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load work orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const quantity = Number(form.quantity);
    if (!form.productId || !Number.isInteger(quantity) || quantity <= 0) {
      toast.error("Select a product and enter a positive whole quantity");
      return;
    }
    setSubmitting(true);
    try {
      await api("/production", {
        method: "POST",
        body: { productId: form.productId, quantity },
      });
      toast.success("Work order created", {
        description: "Complete it when manufacturing finishes to add yield to stock.",
      });
      setOpen(false);
      setForm({ productId: "", quantity: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create work order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete(order: WorkOrder) {
    setCompletingId(order.id);
    try {
      await api(`/production/${order.id}/complete`, { method: "PATCH" });
      toast.success(`Work order for ${order.product.sku} completed`, {
        description: `${order.quantity} units added to stock as production yield.`,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to complete work order");
    } finally {
      setCompletingId(null);
    }
  }

  const canManage = isOwner;

  return (
    <div>
      <PageHeader
        title="Production"
        description="Manufacturing work orders — completing one appends PRODUCTION_YIELD stock to inventory."
        actions={
          canManage ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <HugeiconsIcon icon={PlusSignIcon} size={16} />
                  New work order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>New work order</DialogTitle>
                  <DialogDescription>
                    Plan a manufacturing run for a product.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select
                      value={form.productId || undefined}
                      onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}
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
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity to produce</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="100"
                      value={form.quantity}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, quantity: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Creating…" : "Create work order"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : workOrders.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No work orders yet.
              {canManage
                ? " Plan one to start manufacturing."
                : " Ask the owner to plan one."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.product?.name}</div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {order.product?.sku}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {order.quantity} units
                    </TableCell>
                    <TableCell>
                      <WorkOrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && order.status === "PLANNED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={completingId === order.id}
                          onClick={() => handleComplete(order)}
                        >
                          <HugeiconsIcon icon={TaskDoneIcon} size={14} />
                          {completingId === order.id ? "Completing…" : "Complete"}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
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
