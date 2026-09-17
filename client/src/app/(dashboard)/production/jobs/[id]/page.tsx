"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  PackageIcon,
  FactoryIcon,
  LayersIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { ProductionStageBadge, OrderStatusBadge } from "@/components/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { ProductionJob, ProductionStage } from "@/types";

const STAGES: { stage: ProductionStage; label: string; desc: string }[] = [
  { stage: "QUEUED", label: "Queued", desc: "Awaiting material allocation" },
  { stage: "CUTTING", label: "Cutting", desc: "Fabric precision cutting" },
  { stage: "STITCHING", label: "Stitching", desc: "Assembly and seam binding" },
  { stage: "QUALITY_CHECK", label: "Quality Check", desc: "Defect inspection" },
  { stage: "COMPLETED", label: "Completed", desc: "Yield added to stock" },
];

export default function ProductionJobPassportPage() {
  const params = useParams();
  const jobId = params?.id as string;
  const { isOwner } = useAuth();

  const [job, setJob] = useState<ProductionJob | null>(null);
  const [loading, setLoading] = useState(true);

  // Advance dialog state
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceNote, setAdvanceNote] = useState("");
  const [advancing, setAdvancing] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) return;
    try {
      const data = await api<ProductionJob>(`/production/jobs/${jobId}`);
      setJob(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load job passport");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdvance(e: React.FormEvent) {
    e.preventDefault();
    if (!job) return;
    setAdvancing(true);
    try {
      await api(`/production/jobs/${job.id}/advance`, {
        method: "PATCH",
        body: { note: advanceNote.trim() || undefined },
      });
      toast.success("Job stage advanced successfully", {
        description: "Stage transition has been committed to the immutable audit passport.",
      });
      setAdvanceOpen(false);
      setAdvanceNote("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to advance stage");
    } finally {
      setAdvancing(false);
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

  if (!job) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold">Production Job not found</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          The requested production job does not exist or invalid job ID.
        </p>
        <Button asChild className="mt-6">
          <Link href="/production">Back to Production Board</Link>
        </Button>
      </div>
    );
  }

  const stagesList = ["QUEUED", "CUTTING", "STITCHING", "QUALITY_CHECK", "COMPLETED"];
  const currentStageIndex = stagesList.indexOf(job.stage);
  const isFinalStage = currentStageIndex === stagesList.length - 1;
  const nextStage = !isFinalStage ? stagesList[currentStageIndex + 1] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 h-8 text-muted-foreground">
          <Link href="/production">
            <HugeiconsIcon icon={ArrowLeftIcon} size={16} />
            Back to Production
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Product Passport — Job #${job.id.slice(0, 8).toUpperCase()}`}
        description={`Manufacturing run for ${job.product?.name ?? "Custom Sheet"} · ${job.quantity} units`}
        actions={
          <div className="flex items-center gap-2">
            <ProductionStageBadge stage={job.stage} />

            {!isFinalStage && (
              <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9 shadow-sm">
                    <HugeiconsIcon icon={ArrowRightIcon} size={15} />
                    Advance to {nextStage?.replace(/_/g, " ")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-border/60 bg-background/95 shadow-xl">
                  <DialogHeader>
                    <DialogTitle>Advance Production Stage</DialogTitle>
                    <DialogDescription>
                      Move this job from <strong>{job.stage.replace(/_/g, " ")}</strong> to{" "}
                      <strong>{nextStage?.replace(/_/g, " ")}</strong>.
                      {nextStage === "COMPLETED" && (
                        <span className="block mt-2 text-emerald-600 dark:text-emerald-400 font-medium">
                          Note: Advancing to COMPLETED automatically yields {job.quantity} units into inventory stock!
                        </span>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAdvance} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="stage-note">Stage Transition Note (optional)</Label>
                      <Textarea
                        id="stage-note"
                        placeholder="e.g. Cutting inspected and approved with zero tolerance errors"
                        value={advanceNote}
                        onChange={(e) => setAdvanceNote(e.target.value)}
                        className="border-border/60"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAdvanceOpen(false)}
                        className="border-border/60"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={advancing}>
                        {advancing ? "Advancing…" : `Confirm Advance to ${nextStage?.replace(/_/g, " ")}`}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      {/* Stage-Gate Stepper Progress */}
      <Card className="border-border/60 bg-background/95 shadow-sm overflow-hidden">
        <CardContent className="pt-6">
          <div className="relative flex flex-col sm:flex-row justify-between gap-4">
            {STAGES.map((step, idx) => {
              const isPassed = currentStageIndex >= idx;
              const isCurrent = currentStageIndex === idx;
              return (
                <div key={step.stage} className="flex-1 flex flex-row sm:flex-col items-center gap-3 text-center">
                  <div
                    className={`size-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow"
                        : isPassed
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "bg-muted text-muted-foreground border border-border/60"
                    }`}
                  >
                    {isPassed && !isCurrent ? (
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${isPassed ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground hidden sm:block">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Stage Transition Audit Trail (Mini Product Passport) */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/60 bg-background/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <HugeiconsIcon icon={FactoryIcon} size={18} className="text-primary" />
                Product Passport — Stage Audit Log
              </CardTitle>
              <CardDescription>
                Immutable record of every stage transition performed by shop floor operators and quality managers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {job.stageLogs && job.stageLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60">
                      <TableHead className="h-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Stage</TableHead>
                      <TableHead className="h-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Verified By</TableHead>
                      <TableHead className="h-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Transition Note</TableHead>
                      <TableHead className="h-10 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {job.stageLogs.map((log) => (
                      <TableRow key={log.id} className="transition-colors hover:bg-muted/10">
                        <TableCell className="py-3">
                          <ProductionStageBadge stage={log.stage} />
                        </TableCell>
                        <TableCell className="text-sm font-medium py-3">
                          {log.user?.name ?? "Operator"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3 max-w-[240px]">
                          {log.note ?? "Stage transition verified without comment"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground py-3">
                          {formatDateTime(log.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  This job is currently in initial QUEUED stage. Advance the stage to begin logging audit transitions.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Specification & Order Context */}
        <div className="space-y-6">
          <Card className="border-border/60 bg-background/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Manufacturing Dossier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Target Product</span>
                <p className="font-semibold text-base">
                  <Link
                    href={`/products/${job.productId}`}
                    className="hover:underline text-primary"
                  >
                    {job.product?.name}
                  </Link>
                </p>
                <p className="font-mono text-xs text-muted-foreground">{job.product?.sku}</p>
              </div>
              <Separator />
              <div>
                <span className="text-xs text-muted-foreground">Quantity to Produce</span>
                <p className="font-bold text-lg">{job.quantity} units</p>
              </div>
              <Separator />
              <div>
                <span className="text-xs text-muted-foreground">Originating Order</span>
                <p className="font-medium text-sm">
                  <Link
                    href={`/orders/${job.orderId}`}
                    className="hover:underline text-primary"
                  >
                    Order #{job.orderId.slice(0, 8).toUpperCase()}
                  </Link>
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Customer: {job.order?.customerName ?? "Direct Order"}</span>
                  {job.order && <OrderStatusBadge status={job.order.status} />}
                </div>
              </div>
              <Separator />
              <div>
                <span className="text-xs text-muted-foreground">Job Initiated</span>
                <p className="text-xs">{formatDateTime(job.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
