"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { PageHeader } from "@/components/layout/page-header";
import { AccountBadge, OrderStatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { LedgerEntry, LedgerAccount } from "@/types";

const ACCOUNTS: ("ALL" | LedgerAccount)[] = [
  "ALL",
  "REVENUE",
  "ACCOUNTS_RECEIVABLE",
  "CASH",
  "COGS",
  "INVENTORY_VALUE",
];

export default function FinancePage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountFilter, setAccountFilter] = useState<string>("ALL");

  const load = useCallback(async () => {
    try {
      const entries = await api<LedgerEntry[]>("/finance/ledger");
      setEntries(entries);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load ledger");
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

  const summary = useMemo(() => {
    const byAccount = new Map<LedgerAccount, { debit: number; credit: number }>();
    for (const e of entries) {
      const acc = byAccount.get(e.account) ?? { debit: 0, credit: 0 };
      acc.debit += Number(e.debit);
      acc.credit += Number(e.credit);
      byAccount.set(e.account, acc);
    }
    return Array.from(byAccount.entries()).map(([account, totals]) => ({
      account,
      debit: totals.debit,
      credit: totals.credit,
      balance: totals.debit - totals.credit,
    }));
  }, [entries]);

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Simplified double-entry ledger — every confirmed order writes its debit/credit pair here."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : summary.length === 0 ? (
          <p className="text-muted-foreground col-span-full py-4 text-center text-sm">
            No ledger activity yet.
          </p>
        ) : (
          summary.map((row) => (
            <Card key={row.account}>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {row.account.replace(/_/g, " ")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">
                  {formatCurrency(row.balance)}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Dr {formatCurrency(row.debit)} · Cr {formatCurrency(row.credit)}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Ledger entries</CardTitle>
              <CardDescription>Append-only — newest first</CardDescription>
            </div>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Filter by account" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNTS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a === "ALL" ? "All accounts" : a.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              No ledger entries found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      <AccountBadge account={entry.account} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.order ? (
                        <div className="flex items-center gap-2">
                          <span>{entry.order.customerName}</span>
                          <OrderStatusBadge status={entry.order.status} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {Number(entry.debit) > 0 ? formatCurrency(entry.debit) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {Number(entry.credit) > 0 ? formatCurrency(entry.credit) : ""}
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
