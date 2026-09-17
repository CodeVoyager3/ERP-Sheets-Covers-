"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PlusSignIcon, ActivityIcon, RefreshIconAlias } from "@/lib/hugeicons";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { StockMovementBadge } from "@/components/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { Product, StockLevel, StockMovementWithUser } from "@/types";

function stockBadge(currentStock: number) {
  if (currentStock <= 0)
    return <Badge variant="destructive" className="border-none">Out of stock</Badge>;
  if (currentStock <= 10)
    return <Badge className="border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 border border-amber-500/30">Low · {currentStock}</Badge>;
  return <Badge variant="secondary" className="border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400">{currentStock} units</Badge>;
}

export default function InventoryPage() {
  const { isOwner } = useAuth();
  const [levels, setLevels] = useState<StockLevel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Stock In dialog state
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: "", note: "" });

  // Manual Adjustment dialog state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ productId: "", quantity: "", note: "" });

  // Stock Movements Sheet state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockLevel | null>(null);
  const [movements, setMovements] = useState<StockMovementWithUser[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [levels, products] = await Promise.all([
        api<StockLevel[]>("/inventory/stock"),
        api<Product[]>("/products"),
      ]);
      setLevels(levels);
      setProducts(products);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStockIn(e: React.FormEvent) {
    e.preventDefault();
    const quantity = Number(form.quantity);
    if (!form.productId || !Number.isInteger(quantity) || quantity <= 0) {
      toast.error("Select a product and enter a positive whole quantity");
      return;
    }
    setSubmitting(true);
    try {
      await api("/inventory/stock-in", {
        method: "POST",
        body: {
          productId: form.productId,
          quantity,
          ...(form.note.trim() ? { note: form.note.trim() } : {}),
        },
      });
      toast.success("Stock added", {
        description: "A STOCK_IN entry was appended to the stock ledger.",
      });
      setOpen(false);
      setForm({ productId: "", quantity: "", note: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add stock");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    const quantity = Number(adjustForm.quantity);
    if (!adjustForm.productId || !Number.isInteger(quantity) || quantity <= 0) {
      toast.error("Select a product and enter a positive whole quantity to adjust");
      return;
    }
    setAdjustSubmitting(true);
    try {
      await api("/inventory/adjust", {
        method: "POST",
        body: {
          productId: adjustForm.productId,
          quantity,
          ...(adjustForm.note.trim() ? { note: adjustForm.note.trim() } : {}),
        },
      });
      toast.success("Stock adjustment recorded", {
        description: "An ADJUSTMENT entry was recorded in the append-only stock ledger.",
      });
      setAdjustOpen(false);
      setAdjustForm({ productId: "", quantity: "", note: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to adjust stock");
    } finally {
      setAdjustSubmitting(false);
    }
  }

  async function openHistory(level: StockLevel) {
    setSelectedProduct(level);
    setHistoryOpen(true);
    setMovementsLoading(true);
    try {
      const data = await api<StockMovementWithUser[]>(`/inventory/${level.productId}/movements`);
      setMovements(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load stock movements");
    } finally {
      setMovementsLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Current stock per product, derived as the sum of the append-only stock ledger."
        actions={
          isOwner ? (
            <div className="flex items-center gap-2">
              <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-11 border-border/60">
                    <HugeiconsIcon icon={RefreshIconAlias} size={16} />
                    Adjust Stock
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-border/60 bg-background/95 shadow-xl">
                  <DialogHeader>
                    <DialogTitle>Manual Stock Adjustment</DialogTitle>
                    <DialogDescription>
                      Correct product quantities by appending an ADJUSTMENT audit record to the ledger.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAdjust} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Product</Label>
                      <Select
                        value={adjustForm.productId || undefined}
                        onValueChange={(v) => setAdjustForm((f) => ({ ...f, productId: v }))}
                      >
                        <SelectTrigger className="w-full h-10 border-border/60">
                          <SelectValue placeholder="Select product to adjust" />
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
                      <Label htmlFor="adjust-qty">Adjustment Quantity</Label>
                      <Input
                        id="adjust-qty"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 10"
                        value={adjustForm.quantity}
                        onChange={(e) =>
                          setAdjustForm((f) => ({ ...f, quantity: e.target.value }))
                        }
                        required
                        className="border-border/60 h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adjust-note">Reason / Audit Note</Label>
                      <Textarea
                        id="adjust-note"
                        placeholder="Cycle count physical discrepancy correction"
                        value={adjustForm.note}
                        onChange={(e) => setAdjustForm((f) => ({ ...f, note: e.target.value }))}
                        className="border-border/60"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAdjustOpen(false)}
                        className="border-border/60 h-11"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={adjustSubmitting} className="h-11">
                        {adjustSubmitting ? "Adjusting…" : "Submit Adjustment"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="h-11 shadow-sm">
                    <HugeiconsIcon icon={PlusSignIcon} size={16} />
                    Stock In
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-border/60 bg-background/95 shadow-xl">
                  <DialogHeader>
                    <DialogTitle>Record Stock In</DialogTitle>
                    <DialogDescription>
                      Restock a product by appending a STOCK_IN entry to the ledger.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleStockIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Product</Label>
                      <Select
                        value={form.productId || undefined}
                        onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}
                      >
                        <SelectTrigger className="w-full h-10 border-border/60">
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
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="50"
                        value={form.quantity}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, quantity: e.target.value }))
                        }
                        required
                        className="border-border/60 h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="note">Note (optional)</Label>
                      <Textarea
                        id="note"
                        placeholder="PO #123 received from supplier"
                        value={form.note}
                        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                        className="border-border/60"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border/60 h-11">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting} className="h-11">
                        {submitting ? "Saving…" : "Add stock"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          ) : null
        }
      />

      <Card className="border-border/60 bg-background/95 shadow-sm">
        <CardContent>
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : levels.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No products to track yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">SKU</TableHead>
                  <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Product</TableHead>
                  <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Current Stock</TableHead>
                  <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Status</TableHead>
                  <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Ledger History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map((level) => (
                  <TableRow key={level.productId} className="transition-colors hover:bg-muted/10">
                    <TableCell className="font-mono text-xs py-3.5">
                      <Link
                        href={`/products/${level.productId}`}
                        className="hover:underline text-primary"
                      >
                        {level.sku}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium py-3.5">
                      <Link
                        href={`/products/${level.productId}`}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {level.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-semibold py-3.5">
                      {level.currentStock}
                    </TableCell>
                    <TableCell className="text-right py-3.5">
                      {stockBadge(level.currentStock)}
                    </TableCell>
                    <TableCell className="text-right py-3.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openHistory(level)}
                        className="h-8 text-xs border-border/60"
                      >
                        <HugeiconsIcon icon={ActivityIcon} size={14} />
                        Movement History
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stock Movement History Sheet */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="sm:max-w-xl border-border/60 bg-background/95 overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={ActivityIcon} size={20} className="text-primary" />
              Stock Movement History
            </SheetTitle>
            <SheetDescription>
              Complete append-only audit trail for{" "}
              <strong>{selectedProduct?.name}</strong> ({selectedProduct?.sku})
            </SheetDescription>
          </SheetHeader>

          {selectedProduct && (
            <div className="mb-4 grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 text-center">
              <div>
                <span className="text-xs text-muted-foreground">Current Stock</span>
                <p className="text-lg font-bold">{selectedProduct.currentStock} units</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Total Ledger Events</span>
                <p className="text-lg font-bold">{movements.length}</p>
              </div>
            </div>
          )}

          <Separator />

          <div className="mt-4">
            {movementsLoading ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : movements.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">
                No movements recorded yet for this product.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="h-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Type</TableHead>
                    <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Qty</TableHead>
                    <TableHead className="h-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">User / Note</TableHead>
                    <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => {
                    const isPositive = m.quantity > 0;
                    return (
                      <TableRow key={m.id} className="transition-colors hover:bg-muted/10">
                        <TableCell className="py-3">
                          <StockMovementBadge type={m.type} />
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold text-sm py-3 ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </TableCell>
                        <TableCell className="text-xs py-3 max-w-[180px]">
                          <div className="font-medium text-foreground truncate">
                            {m.user?.name ?? "System"}
                          </div>
                          <div className="text-muted-foreground truncate" title={m.note ?? ""}>
                            {m.note ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-xs py-3 whitespace-nowrap">
                          {formatDateTime(m.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
