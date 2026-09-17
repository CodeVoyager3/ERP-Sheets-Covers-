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

  return (
    <div>
      <PageHeader
        title="Products"
        description="Your product catalog with ledger-derived stock levels."
        actions={
          isOwner ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <HugeiconsIcon icon={PlusSignIcon} size={16} />
                  Add product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
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
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Creating…" : "Create product"}
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
          ) : products.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No products yet. {isOwner ? "Add your first product to get started." : ""}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">In stock</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.currentStock > 0 ? (
                        <Badge variant="secondary">{product.currentStock} units</Badge>
                      ) : (
                        <Badge variant="destructive">Out of stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-sm">
                      {formatDate(product.createdAt)}
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
