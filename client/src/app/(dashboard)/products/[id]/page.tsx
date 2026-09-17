"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  PlusSignIcon,
  PaintBrushIcon,
  PackageIcon,
  LayersIcon,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Product, ProductWithBom, StockLevel } from "@/types";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params?.id as string;
  const { isOwner } = useAuth();

  const [product, setProduct] = useState<ProductWithBom | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Edit Product dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", price: "" });
  const [editing, setEditing] = useState(false);

  // Add BOM component dialog state
  const [bomOpen, setBomOpen] = useState(false);
  const [bomForm, setBomForm] = useState({ componentId: "", quantity: "1" });
  const [addingBom, setAddingBom] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    try {
      const [prod, catalog, stocks] = await Promise.all([
        api<ProductWithBom>(`/products/${productId}`),
        api<Product[]>("/products"),
        api<StockLevel[]>("/inventory/stock"),
      ]);
      setProduct(prod);
      setAllProducts(catalog);
      setEditForm({ name: prod.name, price: String(prod.price) });
      const stockEntry = stocks.find((s) => s.productId === productId);
      setCurrentStock(stockEntry?.currentStock ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    const priceNum = Number(editForm.price);
    if (!editForm.name.trim() || !Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error("Name is required and price must be a positive number");
      return;
    }
    setEditing(true);
    try {
      await api(`/products/${product.id}`, {
        method: "PATCH",
        body: { name: editForm.name.trim(), price: priceNum },
      });
      toast.success("Product updated successfully");
      setEditOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update product");
    } finally {
      setEditing(false);
    }
  }

  async function handleAddBomLine(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    const qtyNum = Number(bomForm.quantity);
    if (!bomForm.componentId || !Number.isInteger(qtyNum) || qtyNum <= 0) {
      toast.error("Select a component product and enter a positive whole quantity");
      return;
    }
    setAddingBom(true);
    try {
      await api(`/products/${product.id}/bom`, {
        method: "POST",
        body: { componentId: bomForm.componentId, quantity: qtyNum },
      });
      toast.success("BOM component added", {
        description: "Order confirmation will now generate manufacturing jobs for this product.",
      });
      setBomOpen(false);
      setBomForm({ componentId: "", quantity: "1" });
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add BOM component");
    } finally {
      setAddingBom(false);
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

  if (!product) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold">Product not found</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          The requested product could not be located in your catalog.
        </p>
        <Button asChild className="mt-6">
          <Link href="/products">Back to Products</Link>
        </Button>
      </div>
    );
  }

  const bomLines = product.bomLines ?? [];

  // Calculate material cost
  const totalBomCost = bomLines.reduce((sum, line) => {
    const compPrice = Number(line.componentProduct?.price ?? 0);
    return sum + compPrice * line.quantityRequired;
  }, 0);

  const sellingPrice = Number(product.price);
  const profitMargin = sellingPrice - totalBomCost;
  const marginPercent = sellingPrice > 0 ? (profitMargin / sellingPrice) * 100 : 0;

  // Potential components for dropdown (exclude self)
  const candidateComponents = allProducts.filter((p) => p.id !== product.id);

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 h-8 text-muted-foreground">
          <Link href="/products">
            <HugeiconsIcon icon={ArrowLeftIcon} size={16} />
            Back to Products
          </Link>
        </Button>
      </div>

      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku} · Created on ${formatDate(product.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {currentStock > 0 ? (
              <Badge variant="secondary" className="border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400">
                {currentStock} in stock
              </Badge>
            ) : (
              <Badge variant="destructive" className="border-none">
                Out of stock
              </Badge>
            )}

            {isOwner && (
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 border-border/60">
                    <HugeiconsIcon icon={PaintBrushIcon} size={15} />
                    Edit Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-border/60 bg-background/95 shadow-xl">
                  <DialogHeader>
                    <DialogTitle>Edit Product</DialogTitle>
                    <DialogDescription>
                      Update product details. Note that SKU ({product.sku}) is permanent.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateProduct} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Product Name</Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        required
                        className="h-10 border-border/60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-price">Selling Price (₹)</Label>
                      <Input
                        id="edit-price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                        required
                        className="h-10 border-border/60"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditOpen(false)}
                        className="border-border/60"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={editing}>
                        {editing ? "Saving…" : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {isOwner && (
              <Dialog open={bomOpen} onOpenChange={setBomOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9 shadow-sm">
                    <HugeiconsIcon icon={PlusSignIcon} size={15} />
                    Add BOM Component
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-border/60 bg-background/95 shadow-xl">
                  <DialogHeader>
                    <DialogTitle>Add Bill of Materials Component</DialogTitle>
                    <DialogDescription>
                      Define a raw material or sub-component required to manufacture 1 unit of {product.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddBomLine} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Component Product</Label>
                      <Select
                        value={bomForm.componentId}
                        onValueChange={(v) => setBomForm((f) => ({ ...f, componentId: v }))}
                      >
                        <SelectTrigger className="w-full h-10 border-border/60">
                          <SelectValue placeholder="Select raw material or component" />
                        </SelectTrigger>
                        <SelectContent>
                          {candidateComponents.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.sku} — {c.name} ({formatCurrency(c.price)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bom-qty">Quantity Required (per unit)</Label>
                      <Input
                        id="bom-qty"
                        type="number"
                        min="1"
                        step="1"
                        value={bomForm.quantity}
                        onChange={(e) => setBomForm((f) => ({ ...f, quantity: e.target.value }))}
                        required
                        className="h-10 border-border/60"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setBomOpen(false)}
                        className="border-border/60"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addingBom}>
                        {addingBom ? "Adding…" : "Add Component"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      {/* KPI Cards: Price, BOM Cost, Margin, Stock */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-background/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Selling Price</CardTitle>
            <div className="rounded-lg p-2 bg-emerald-600/10 dark:bg-emerald-400/10">
              <HugeiconsIcon icon={InvoiceIcon} size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(product.price)}</div>
            <p className="text-muted-foreground mt-1 text-xs">Standard catalog listing</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">BOM Material Cost</CardTitle>
            <div className="rounded-lg p-2 bg-purple-600/10 dark:bg-purple-400/10">
              <HugeiconsIcon icon={LayersIcon} size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBomCost)}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {bomLines.length} component{bomLines.length === 1 ? "" : "s"} defined
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Gross Margin</CardTitle>
            <div className="rounded-lg p-2 bg-sky-600/10 dark:bg-sky-400/10">
              <HugeiconsIcon icon={InvoiceIcon} size={18} className="text-sky-600 dark:text-sky-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bomLines.length > 0 ? `${marginPercent.toFixed(1)}%` : "N/A"}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {bomLines.length > 0 ? `${formatCurrency(profitMargin)} / unit profit` : "No BOM defined"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Available Inventory</CardTitle>
            <div className="rounded-lg p-2 bg-amber-600/10 dark:bg-amber-400/10">
              <HugeiconsIcon icon={PackageIcon} size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStock} units</div>
            <p className="text-muted-foreground mt-1 text-xs">Derived from stock ledger</p>
          </CardContent>
        </Card>
      </div>

      {/* Bill of Materials (BOM) Section */}
      <Card className="border-border/60 bg-background/95 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <HugeiconsIcon icon={LayersIcon} size={18} className="text-primary" />
              Bill of Materials (BOM)
            </CardTitle>
            <CardDescription>
              Components and raw materials required to assemble 1 unit of this product.
            </CardDescription>
          </div>
          {isOwner && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBomOpen(true)}
              className="h-9 border-border/60"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
              Add Component
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {bomLines.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No Bill of Materials configured for this product.
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Products without BOM lines are treated as direct inventory items. Adding components enables automatic production job queuing when an order is confirmed.
              </p>
              {isOwner && (
                <Button
                  size="sm"
                  onClick={() => setBomOpen(true)}
                  className="mt-4 h-9 shadow-sm"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={15} />
                  Add First Component
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="h-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Component SKU</TableHead>
                  <TableHead className="h-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Component Name</TableHead>
                  <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Qty Required / Unit</TableHead>
                  <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Component Price</TableHead>
                  <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Subtotal Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bomLines.map((line) => {
                  const comp = line.componentProduct;
                  const compPrice = Number(comp?.price ?? 0);
                  const subtotal = compPrice * line.quantityRequired;
                  return (
                    <TableRow key={line.id} className="transition-colors hover:bg-muted/10">
                      <TableCell className="font-mono text-xs py-3.5">
                        {comp?.sku ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium text-sm py-3.5">
                        {comp ? (
                          <Link
                            href={`/products/${comp.id}`}
                            className="hover:underline text-primary"
                          >
                            {comp.name}
                          </Link>
                        ) : (
                          "Unknown component"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm py-3.5">
                        {line.quantityRequired}
                      </TableCell>
                      <TableCell className="text-right text-sm py-3.5">
                        {comp ? formatCurrency(comp.price) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm py-3.5">
                        {formatCurrency(subtotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {bomLines.length > 0 && (
            <div className="mt-4 flex justify-between items-center border-t border-border/60 pt-4 text-sm">
              <span className="text-muted-foreground text-xs">
                Total Material BOM Requirement per finished unit:
              </span>
              <span className="font-bold text-base">
                {formatCurrency(totalBomCost)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
