"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PlusSignIcon, PaintBrushIcon, LayersIcon } from "@/lib/hugeicons";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Product, StockLevel } from "@/types";

interface ProductWithStock extends Product {
  currentStock: number;
}

export default function ProductsPage() {
  const { isOwner } = useAuth();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ sku: "", name: "", price: "" });

  // Edit Product state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      const [products, stock] = await Promise.all([
        api<Product[]>("/products"),
        api<StockLevel[]>("/inventory/stock"),
      ]);
      const stockMap = new Map(stock.map((s) => [s.productId, s.currentStock]));
      setProducts(
        products.map((p) => ({ ...p, currentStock: stockMap.get(p.id) ?? 0 }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const price = Number(form.price);
      if (!form.sku || !form.name || !Number.isFinite(price) || price <= 0) {
        toast.error("SKU and name are required, price must be positive");
        return;
      }
      await api("/products", {
        method: "POST",
        body: { sku: form.sku, name: form.name, price },
      });
      toast.success("Product created");
      setOpen(false);
      setForm({ sku: "", name: "", price: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    const p = Number(editPrice);
    if (!editName.trim() || !Number.isFinite(p) || p <= 0) {
      toast.error("Name is required and price must be a positive number");
      return;
    }
    setSavingEdit(true);
    try {
      await api(`/products/${editingProduct.id}`, {
        method: "PATCH",
        body: { name: editName.trim(), price: p },
      });
      toast.success("Product updated successfully");
      setEditingProduct(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update product");
    } finally {
      setSavingEdit(false);
    }
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(String(product.price));
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Your product catalog with ledger-derived stock levels and Bill of Materials (BOM)."
        actions={
          isOwner ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 shadow-sm">
                  <HugeiconsIcon icon={PlusSignIcon} size={16} />
                  Add product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md border-border/60 bg-background/95 shadow-xl">
                <DialogHeader>
                  <DialogTitle>Add product</DialogTitle>
                  <DialogDescription>
                    Create a new product in the catalog. SKU must be unique.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      placeholder="SC-SEDAN-GRY"
                      value={form.sku}
                      onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                      required
                      minLength={3}
                      className="border-border/60 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Car seat cover — Sedan — Grey"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                      className="border-border/60 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="2499.00"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      required
                      className="border-border/60 h-11"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border/60 h-11">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="h-11">
                      {submitting ? "Creating…" : "Create product"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
          ) : products.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No products yet. {isOwner ? "Add your first product to get started." : ""}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">SKU</TableHead>
                  <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Name</TableHead>
                  <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Price</TableHead>
                  <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">In stock</TableHead>
                  <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Created</TableHead>
                  <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="transition-colors hover:bg-muted/10">
                    <TableCell className="font-mono text-xs py-3.5">
                      <Link
                        href={`/products/${product.id}`}
                        className="hover:underline text-primary"
                      >
                        {product.sku}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium py-3.5">
                      <Link
                        href={`/products/${product.id}`}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {product.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right py-3.5">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell className="text-right py-3.5">
                      {product.currentStock > 0 ? (
                        <Badge variant="secondary" className="border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400">{product.currentStock} units</Badge>
                      ) : (
                        <Badge variant="destructive" className="border-none">Out of stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-sm py-3.5">
                      {formatDate(product.createdAt)}
                    </TableCell>
                    <TableCell className="text-right py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {isOwner && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(product)}
                            className="h-8 text-xs"
                          >
                            <HugeiconsIcon icon={PaintBrushIcon} size={14} />
                            Edit
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-8 text-xs border-border/60"
                        >
                          <Link href={`/products/${product.id}`}>
                            <HugeiconsIcon icon={LayersIcon} size={14} />
                            BOM & Details
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      {editingProduct && (
        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent className="sm:max-w-md border-border/60 bg-background/95 shadow-xl">
            <DialogHeader>
              <DialogTitle>Edit Product — {editingProduct.sku}</DialogTitle>
              <DialogDescription>
                Update the product catalog information.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="border-border/60 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price (₹)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  required
                  className="border-border/60 h-11"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProduct(null)}
                  className="border-border/60 h-11"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingEdit} className="h-11">
                  {savingEdit ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
