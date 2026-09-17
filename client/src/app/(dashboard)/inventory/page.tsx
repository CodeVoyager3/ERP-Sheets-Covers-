"use client";

import { useCallback, useEffect, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { api, ApiError } from "@/lib/api";
import type { Product, StockLevel } from "@/types";

function stockBadge(currentStock: number) {
  if (currentStock <= 0)
    return <Badge variant="destructive">Out of stock</Badge>;
  if (currentStock <= 10)
    return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">Low · {currentStock}</Badge>;
  return <Badge variant="secondary">{currentStock} units</Badge>;
}

export default function InventoryPage() {
  const { isOwner } = useAuth();
  const [levels, setLevels] = useState<StockLevel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: "", note: "" });

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

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Current stock per product, derived as the sum of the append-only stock ledger."
        actions={
          isOwner ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <HugeiconsIcon icon={PlusSignIcon} size={16} />
                  Stock in
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Record stock in</DialogTitle>
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note">Note (optional)</Label>
                    <Textarea
                      id="note"
                      placeholder="PO #123 received from supplier"
                      value={form.note}
                      onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Saving…" : "Add stock"}
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
          ) : levels.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No products to track yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Current stock</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map((level) => (
                  <TableRow key={level.productId}>
                    <TableCell className="font-mono text-xs">{level.sku}</TableCell>
                    <TableCell className="font-medium">{level.name}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {level.currentStock}
                    </TableCell>
                    <TableCell className="text-right">
                      {stockBadge(level.currentStock)}
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
