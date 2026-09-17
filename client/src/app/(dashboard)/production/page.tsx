"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  PlusSignIcon,
  TaskDoneIcon,
  FactoryIcon,
  LayersIcon,
  ArrowRightIcon,
  SearchIcon,
} from "@/lib/hugeicons";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { WorkOrderStatusBadge, ProductionStageBadge, OrderStatusBadge } from "@/components/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type {
  Product,
  WorkOrder,
  ProductionJob,
  ProductionStage,
  ActivityLogEntry,
} from "@/types";

const STAGE_FILTERS: ("ALL" | ProductionStage)[] = [
  "ALL",
  "QUEUED",
  "CUTTING",
  "STITCHING",
  "QUALITY_CHECK",
  "COMPLETED",
];

const STAGES_SEQUENCE: ProductionStage[] = [
  "QUEUED",
  "CUTTING",
  "STITCHING",
  "QUALITY_CHECK",
  "COMPLETED",
];

export default function ProductionPage() {
  const { isOwner } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  // Work order creation state
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: "" });
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Advance stage modal state
  const [advancingJob, setAdvancingJob] = useState<ProductionJob | null>(null);
  const [advanceNote, setAdvanceNote] = useState("");
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Manual Job Lookup dialog state
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupJobId, setLookupJobId] = useState("");
  const [lookupSearching, setLookupSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      const [wOrders, prods] = await Promise.all([
        api<WorkOrder[]>("/production"),
        api<Product[]>("/products"),
      ]);
      setWorkOrders(wOrders);
      setProducts(prods);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load production data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      // Find discovered production jobs through activity logs
      const logs = await api<ActivityLogEntry[]>("/activity-logs").catch(() => [] as ActivityLogEntry[]);
      const jobIds = Array.from(
        new Set(
          logs
            .filter((l) => l.entityType === "ProductionJob" || l.entityType === "ProductionStageLog")
            .map((l) => l.entityId)
        )
      );

      // Also check stored job IDs from localStorage
      if (typeof window !== "undefined") {
        const stored = JSON.parse(window.localStorage.getItem("tracked_production_job_ids") || "[]");
        if (Array.isArray(stored)) {
          stored.forEach((id) => {
            if (!jobIds.includes(id)) jobIds.push(id);
          });
        }
      }

      // Fetch each job's details
      const fetchedJobs = await Promise.all(
        jobIds.map((id) =>
          api<ProductionJob>(`/production/jobs/${id}`).catch(() => null)
        )
      );

      const validJobs = fetchedJobs.filter((j): j is ProductionJob => j !== null);
      setProductionJobs(validJobs);
    } catch {
      // Silently fail if activity log is restricted or empty
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadJobs();
  }, [load, loadJobs]);

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

  async function handleAdvanceStage(e: React.FormEvent) {
    e.preventDefault();
    if (!advancingJob) return;
    setIsAdvancing(true);
    try {
      await api(`/production/jobs/${advancingJob.id}/advance`, {
        method: "PATCH",
        body: { note: advanceNote.trim() || undefined },
      });
      toast.success("Job stage advanced successfully");
      setAdvancingJob(null);
      setAdvanceNote("");
      await loadJobs();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to advance stage");
    } finally {
      setIsAdvancing(false);
    }
  }

  async function handleLookupJob(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupJobId.trim()) return;
    setLookupSearching(true);
    try {
      const job = await api<ProductionJob>(`/production/jobs/${lookupJobId.trim()}`);
      if (typeof window !== "undefined") {
        const stored = JSON.parse(window.localStorage.getItem("tracked_production_job_ids") || "[]");
        if (!stored.includes(job.id)) {
          stored.push(job.id);
          window.localStorage.setItem("tracked_production_job_ids", JSON.stringify(stored));
        }
      }
      setProductionJobs((prev) => (prev.some((p) => p.id === job.id) ? prev : [job, ...prev]));
      toast.success(`Loaded Job for ${job.product?.name ?? "Product"}`);
      setLookupOpen(false);
      setLookupJobId("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Production job not found");
    } finally {
      setLookupSearching(false);
    }
  }

  const filteredJobs = useMemo(
    () =>
      stageFilter === "ALL"
        ? productionJobs
        : productionJobs.filter((j) => j.stage === stageFilter),
    [productionJobs, stageFilter]
  );

  const canManage = isOwner;

  return (
    <div>
      <PageHeader
        title="Production Management"
        description="Stage-gate manufacturing runs with immutable Product Passports and planned work orders."
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={lookupOpen} onOpenChange={setLookupOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-11 border-border/60">
                  <HugeiconsIcon icon={SearchIcon} size={16} />
                  Find Job by ID
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md border-border/60 bg-background/95 shadow-xl">
                <DialogHeader>
                  <DialogTitle>Find Production Job</DialogTitle>
                  <DialogDescription>
                    Enter a Production Job UUID to load its Product Passport and track stage advancement.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleLookupJob} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lookup-id">Job ID (UUID)</Label>
                    <Input
                      id="lookup-id"
                      placeholder="e.g. 8fa16008-8dfc-457f-b67e-2cf847d02ce9"
                      value={lookupJobId}
                      onChange={(e) => setLookupJobId(e.target.value)}
                      required
                      className="border-border/60 font-mono text-xs h-11"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLookupOpen(false)}
                      className="border-border/60 h-11"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={lookupSearching} className="h-11">
                      {lookupSearching ? "Searching…" : "Load Job"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {canManage && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="h-11 shadow-sm">
                    <HugeiconsIcon icon={PlusSignIcon} size={16} />
                    New Work Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-border/60 bg-background/95 shadow-xl">
                  <DialogHeader>
                    <DialogTitle>New Work Order</DialogTitle>
                    <DialogDescription>
                      Plan a direct manufacturing run for a product.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4">
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
                        className="border-border/60 h-11"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border/60 h-11">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting} className="h-11">
                        {submitting ? "Creating…" : "Create work order"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="border-border/60 bg-background/95">
          <TabsTrigger value="jobs" className="gap-2">
            <HugeiconsIcon icon={FactoryIcon} size={16} />
            Stage-Gate Jobs ({productionJobs.length})
          </TabsTrigger>
          <TabsTrigger value="workorders" className="gap-2">
            <HugeiconsIcon icon={LayersIcon} size={16} />
            Work Orders ({workOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Stage-Gate Jobs */}
        <TabsContent value="jobs">
          <Card className="border-border/60 bg-background/95 shadow-sm">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-52 h-10 border-border/60">
                    <SelectValue placeholder="Filter by stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_FILTERS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "ALL" ? "All Stages" : s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground text-xs">
                  {filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"}
                </span>
              </div>

              {jobsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground text-sm">
                    No stage-gate production jobs found.
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Production jobs are created automatically when an order containing products with a Bill of Materials (BOM) is confirmed.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLookupOpen(true)}
                    className="mt-4 border-border/60"
                  >
                    Track Job by UUID
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60">
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Job / Product</TableHead>
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Order Ref</TableHead>
                      <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Qty</TableHead>
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Current Stage</TableHead>
                      <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => {
                      const currIdx = STAGES_SEQUENCE.indexOf(job.stage);
                      const isComplete = job.stage === "COMPLETED";
                      const nextStage = !isComplete ? STAGES_SEQUENCE[currIdx + 1] : null;
                      return (
                        <TableRow key={job.id} className="transition-colors hover:bg-muted/10">
                          <TableCell className="py-3.5">
                            <Link
                              href={`/production/jobs/${job.id}`}
                              className="font-medium hover:underline text-foreground hover:text-primary"
                            >
                              {job.product?.name ?? "Sheet Cover"}
                            </Link>
                            <div className="font-mono text-xs text-muted-foreground">
                              #{job.id.slice(0, 8)} · {job.product?.sku}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-3.5">
                            <Link
                              href={`/orders/${job.orderId}`}
                              className="hover:underline text-primary"
                            >
                              Order #{job.orderId.slice(0, 8)}
                            </Link>
                            <div className="text-muted-foreground">
                              {job.order?.customerName ?? "Customer"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm py-3.5">
                            {job.quantity} units
                          </TableCell>
                          <TableCell className="py-3.5">
                            <ProductionStageBadge stage={job.stage} />
                          </TableCell>
                          <TableCell className="text-right py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              {!isComplete && canManage && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAdvancingJob(job)}
                                  className="h-8 text-xs border-border/60"
                                >
                                  <HugeiconsIcon icon={ArrowRightIcon} size={14} />
                                  Advance to {nextStage?.replace(/_/g, " ")}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                className="h-8 text-xs border-border/60"
                              >
                                <Link href={`/production/jobs/${job.id}`}>
                                  Passport
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Work Orders */}
        <TabsContent value="workorders">
          <Card className="border-border/60 bg-background/95 shadow-sm">
            <CardContent className="pt-6">
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
                    ? " Plan one to start direct manufacturing."
                    : " Ask the owner to plan one."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60">
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Product</TableHead>
                      <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Quantity</TableHead>
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Status</TableHead>
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Created</TableHead>
                      <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workOrders.map((order) => (
                      <TableRow key={order.id} className="transition-colors hover:bg-muted/10">
                        <TableCell className="py-3.5">
                          <Link
                            href={`/products/${order.productId}`}
                            className="font-medium hover:underline text-foreground hover:text-primary"
                          >
                            {order.product?.name}
                          </Link>
                          <div className="text-muted-foreground font-mono text-xs">
                            {order.product?.sku}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold py-3.5">
                          {order.quantity} units
                        </TableCell>
                        <TableCell className="py-3.5">
                          <WorkOrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm py-3.5">
                          {formatDateTime(order.createdAt)}
                        </TableCell>
                        <TableCell className="text-right py-3.5">
                          {canManage && order.status === "PLANNED" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={completingId === order.id}
                              onClick={() => handleComplete(order)}
                              className="h-9 border-border/60"
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
        </TabsContent>
      </Tabs>

      {/* Advance Stage Dialog */}
      {advancingJob && (
        <Dialog open={!!advancingJob} onOpenChange={(o) => !o && setAdvancingJob(null)}>
          <DialogContent className="sm:max-w-md border-border/60 bg-background/95 shadow-xl">
            <DialogHeader>
              <DialogTitle>Advance Stage — Job #{advancingJob.id.slice(0, 8)}</DialogTitle>
              <DialogDescription>
                Advance stage for {advancingJob.product?.name}. Add an optional note to the Product Passport audit log.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdvanceStage} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adv-note">Transition Note (optional)</Label>
                <Textarea
                  id="adv-note"
                  placeholder="e.g. Stitching checked and verified for dimensional tolerances"
                  value={advanceNote}
                  onChange={(e) => setAdvanceNote(e.target.value)}
                  className="border-border/60"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdvancingJob(null)}
                  className="border-border/60"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdvancing}>
                  {isAdvancing ? "Advancing…" : "Advance Stage"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
