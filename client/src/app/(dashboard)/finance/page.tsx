"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BankIcon,
  WalletIcon,
  MoneyBagIcon,
  InvoiceIcon,
  PackageIcon,
  ShieldIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { AccountBadge, OrderStatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { LedgerEntry, LedgerAccount, FinanceSummary } from "@/types";

const ACCOUNTS: ("ALL" | LedgerAccount)[] = [
  "ALL",
  "REVENUE",
  "ACCOUNTS_RECEIVABLE",
  "CASH",
  "COGS",
  "INVENTORY_VALUE",
];

const ACCOUNT_METADATA: Record<
  LedgerAccount,
  { label: string; icon: any; color: string; bgColor: string }
> = {
  REVENUE: {
    label: "Revenue",
    icon: WalletIcon,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-600/10 dark:bg-emerald-400/10",
  },
  ACCOUNTS_RECEIVABLE: {
    label: "Accounts Receivable",
    icon: InvoiceIcon,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-600/10 dark:bg-blue-400/10",
  },
  CASH: {
    label: "Cash in Hand / Bank",
    icon: BankIcon,
    color: "text-lime-600 dark:text-lime-400",
    bgColor: "bg-lime-600/10 dark:bg-lime-400/10",
  },
  COGS: {
    label: "Cost of Goods Sold",
    icon: MoneyBagIcon,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-600/10 dark:bg-orange-400/10",
  },
  INVENTORY_VALUE: {
    label: "Inventory Valuation",
    icon: PackageIcon,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-600/10 dark:bg-purple-400/10",
  },
};

export default function FinancePage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summaries, setSummaries] = useState<FinanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountFilter, setAccountFilter] = useState<string>("ALL");

  const load = useCallback(async () => {
    try {
      const [ledgerData, summaryData] = await Promise.all([
        api<LedgerEntry[]>("/finance/ledger"),
        api<FinanceSummary[]>("/finance/summary").catch(() => [] as FinanceSummary[]),
      ]);
      setEntries(ledgerData);
      setSummaries(summaryData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      accountFilter === "ALL"
        ? entries
        : entries.filter((e) => e.account === accountFilter),
    [entries, accountFilter]
  );

  // Derived or summary data for cards
  const summaryMap = useMemo(() => {
    const map = new Map<LedgerAccount, FinanceSummary>();
    summaries.forEach((s) => map.set(s.account, s));
    return map;
  }, [summaries]);

  const allAccounts: LedgerAccount[] = [
    "REVENUE",
    "ACCOUNTS_RECEIVABLE",
    "CASH",
    "INVENTORY_VALUE",
    "COGS",
  ];

  // Calculate Net Current Assets = Cash + Receivables + Inventory
  const cashBal = summaryMap.get("CASH")?.balance ?? 0;
  const arBal = summaryMap.get("ACCOUNTS_RECEIVABLE")?.balance ?? 0;
  const invBal = summaryMap.get("INVENTORY_VALUE")?.balance ?? 0;
  const netAssets = cashBal + arBal + invBal;
  const revenueBal = summaryMap.get("REVENUE")?.balance ?? 0;

  return (
    <div>
      <PageHeader
        title="Financial Ledger & Summary"
        description="Double-entry financial accounting ledger with real-time aggregated account balances."
      />

      {/* Aggregate Overview Banner */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          allAccounts.map((accKey) => {
            const data = summaryMap.get(accKey) ?? {
              account: accKey,
              debit: 0,
              credit: 0,
              balance: 0,
            };
            const meta = ACCOUNT_METADATA[accKey];
            const Icon = meta.icon;

            return (
              <Card
                key={accKey}
                className="border-border/60 bg-background/95 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {meta.label}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${meta.bgColor}`}>
                    <HugeiconsIcon icon={Icon} size={16} className={meta.color} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{formatCurrency(data.balance)}</div>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Dr {formatCurrency(data.debit)} · Cr {formatCurrency(data.credit)}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Summary Highlight Box */}
      <Card className="mb-6 border-border/60 bg-background/95 shadow-sm">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2.5 bg-primary/10 text-primary">
                <HugeiconsIcon icon={ShieldIcon} size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Accounting Position Overview</p>
                <p className="text-xs text-muted-foreground">
                  Aggregated from all posted transactions. Strict double-entry integrity maintained.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-muted-foreground">Net Revenue</span>
                <p className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(revenueBal)}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Accounts Receivable (Outstanding)</span>
                <p className="font-bold text-base text-blue-600 dark:text-blue-400">
                  {formatCurrency(arBal)}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Combined Current Assets</span>
                <p className="font-bold text-base text-foreground">
                  {formatCurrency(netAssets)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Journal Ledger */}
      <Card className="border-border/60 bg-background/95 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Journal Ledger Entries</CardTitle>
              <CardDescription>
                Chronological double-entry records — newest posted first
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-56 h-10 border-border/60">
                  <SelectValue placeholder="Filter by account" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNTS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a === "ALL" ? "All Accounts" : a.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No ledger entries found for the selected filter.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Date & Time</TableHead>
                  <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Account</TableHead>
                  <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Reference / Order</TableHead>
                  <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Debit (Dr)</TableHead>
                  <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Credit (Cr)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id} className="transition-colors hover:bg-muted/10">
                    <TableCell className="text-muted-foreground text-sm py-3.5 whitespace-nowrap">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <AccountBadge account={entry.account} />
                    </TableCell>
                    <TableCell className="text-sm py-3.5">
                      {entry.order ? (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/orders/${entry.orderId}`}
                            className="font-medium hover:underline text-primary"
                          >
                            {entry.order.customerName}
                          </Link>
                          <OrderStatusBadge status={entry.order.status} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-mono text-xs">General Journal</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm py-3.5 font-medium">
                      {Number(entry.debit) > 0 ? (
                        <span className="text-foreground">{formatCurrency(entry.debit)}</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm py-3.5 font-medium">
                      {Number(entry.credit) > 0 ? (
                        <span className="text-foreground">{formatCurrency(entry.credit)}</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
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
