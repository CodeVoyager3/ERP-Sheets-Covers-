"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ShoppingCartIcon,
  PackageIcon,
  WalletIcon,
  FactoryIcon,
} from "@/lib/hugeicons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Area, AreaChart, XAxis } from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Order, StockLevel, LedgerEntry, WorkOrder } from "@/types";

const statusConfig = {
  status: { label: "Orders" },
  PENDING: { label: "Pending", color: "var(--chart-1)" },
  CONFIRMED: { label: "Confirmed", color: "var(--chart-2)" },
  IN_PRODUCTION: { label: "In production", color: "var(--chart-3)" },
  DISPATCHED: { label: "Dispatched", color: "var(--chart-4)" },
  DELIVERED: { label: "Delivered", color: "var(--chart-5)" },
  CANCELLED: { label: "Cancelled", color: "var(--destructive)" },
} satisfies ChartConfig;

const stockConfig = {
  stock: { label: "Stock", color: "var(--chart-2)" },
} satisfies ChartConfig;

const revenueConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

interface DashboardData {
  orders: Order[];
  stock: StockLevel[];
  ledger: LedgerEntry[];
  workOrders: WorkOrder[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [orders, stock, ledger, workOrders] = await Promise.all([
          api<Order[]>("/orders"),
          api<StockLevel[]>("/inventory/stock"),
          api<LedgerEntry[]>("/finance/ledger").catch(() => [] as LedgerEntry[]),
          api<WorkOrder[]>("/production"),
        ]);
        if (!cancelled) setData({ orders, stock, ledger, workOrders });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of your business at a glance." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { orders, stock, ledger, workOrders } = data;

  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const openWorkOrders = workOrders.filter((w) => w.status === "PLANNED").length;
  const revenue = ledger
    .filter((e) => e.account === "REVENUE")
    .reduce((sum, e) => sum + Number(e.credit), 0);
  const receivables = ledger
    .filter((e) => e.account === "ACCOUNTS_RECEIVABLE")
    .reduce((sum, e) => sum + Number(e.debit), 0);
  const lowStock = stock.filter((s) => s.currentStock <= 10).length;

  const ordersByStatus = (
    ["PENDING", "CONFIRMED", "IN_PRODUCTION", "DISPATCHED", "DELIVERED", "CANCELLED"] as const
  )
    .map((status) => ({
      status,
      count: orders.filter((o) => o.status === status).length,
    }))
    .filter((d) => d.count > 0);

  const revenueByDay = ledger
    .filter((e) => e.account === "REVENUE")
    .reduce<Record<string, number>>((acc, e) => {
      const day = new Date(e.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
      acc[day] = (acc[day] ?? 0) + Number(e.credit);
      return acc;
    }, {});
  const revenueSeries = Object.entries(revenueByDay)
    .map(([day, revenue]) => ({ day, revenue }))
    .slice(-14);

  const stockSeries = stock.slice(0, 8).map((s) => ({
    name: s.sku,
    stock: s.currentStock,
  }));

  const kpis = [
    {
      title: "Total Orders",
      value: String(orders.length),
      sub: `${pendingOrders} pending`,
      icon: ShoppingCartIcon,
    },
    {
      title: "Revenue",
      value: formatCurrency(revenue),
      sub: `${formatCurrency(receivables)} receivable`,
      icon: WalletIcon,
    },
    {
      title: "Products Tracked",
      value: String(stock.length),
      sub: `${lowStock} low on stock`,
      icon: PackageIcon,
    },
    {
      title: "Work Orders",
      value: String(workOrders.length),
      sub: `${openWorkOrders} open`,
      icon: FactoryIcon,
    },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your business at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {kpi.title}
              </CardTitle>
              <HugeiconsIcon icon={kpi.icon} size={20} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{kpi.value}</div>
              <p className="text-muted-foreground mt-1 text-xs">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue over time</CardTitle>
            <CardDescription>Credited revenue per day (ledger)</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueSeries.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                No revenue recorded yet — confirm an order to see it here.
              </p>
            ) : (
              <ChartContainer config={revenueConfig} className="h-64 w-full">
                <AreaChart data={revenueSeries} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="revenue"
                    type="monotone"
                    fill="var(--color-revenue)"
                    fillOpacity={0.2}
                    stroke="var(--color-revenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
            <CardDescription>Current pipeline distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                No orders yet.
              </p>
            ) : (
              <ChartContainer config={statusConfig} className="h-64 w-full">
                <BarChart data={ordersByStatus} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="status"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v: string) => v.replace("_", " ")}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--chart-2)" radius={6} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Current stock</CardTitle>
          <CardDescription>
            Ledger-derived stock levels per product ·{" "}
            <Link href="/inventory" className="text-primary underline-offset-4 hover:underline">
              View inventory
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stockSeries.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No products yet — add your first product to start tracking stock.
            </p>
          ) : (
            <ChartContainer config={stockConfig} className="h-64 w-full">
              <BarChart data={stockSeries} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="stock" fill="var(--color-stock)" radius={6} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
