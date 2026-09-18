"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusSignIcon, ActivityIcon, UserGroupIcon } from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { User, Role, ActivityLogEntry } from "@/types";

export default function UsersPage() {
  const { user: currentUser, isOwner } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("staff");
  const [userFilter, setUserFilter] = useState<string>("ALL");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Add staff modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "STAFF" as Role,
    password: "",
  });

  const load = useCallback(async () => {
    try {
      const [users, logs] = await Promise.all([
        api<User[]>("/users"),
        api<ActivityLogEntry[]>("/activity-logs"),
      ]);
      setUsers(users);
      setLogs(logs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredLogs = useMemo(
    () =>
      userFilter === "ALL"
        ? logs
        : logs.filter((l) => l.user?.email === userFilter),
    [logs, userFilter]
  );

  async function handleUpdate(
    target: User,
    update: { role?: Role; isActive?: boolean }
  ) {
    setSavingId(target.id);
    try {
      await api(`/users/${target.id}`, { method: "PATCH", body: update });
      toast.success(`${target.name} updated successfully`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update user");
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      toast.error("Name, email, and temporary password are required");
      return;
    }
    setCreating(true);
    try {
      await api("/users", {
        method: "POST",
        body: {
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          role: createForm.role,
          password: createForm.password.trim(),
        },
      });
      toast.success(`Staff member ${createForm.name} created successfully`);
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", role: "STAFF", password: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create staff account");
    } finally {
      setCreating(false);
    }
  }

  function viewUserActivity(email: string) {
    setUserFilter(email);
    setActiveTab("activity");
  }

  function renderDetails(details: unknown) {
    if (!details) return null;
    if (typeof details === "string") return <span>{details}</span>;
    if (typeof details === "object" && details !== null) {
      const entries = Object.entries(details as Record<string, unknown>);
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {entries.map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              <strong>{k}:</strong>&nbsp;{String(v)}
            </span>
          ))}
        </div>
      );
    }
    return String(details);
  }

  return (
    <div>
      <PageHeader
        title="Users & Activity Log"
        description="Manage staff access levels, provision accounts, and monitor the audit trail of operations."
        actions={
          isOwner ? (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 shadow-sm">
                  <HugeiconsIcon icon={PlusSignIcon} size={16} />
                  Add Staff Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md border-border/60 bg-background/95 shadow-xl">
                <DialogHeader>
                  <DialogTitle>Add Staff Member</DialogTitle>
                  <DialogDescription>
                    Create a new staff or manager account with role-based access to the platform.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateStaff} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="staff-name">Full Name</Label>
                    <Input
                      id="staff-name"
                      placeholder="Vikram Singh"
                      value={createForm.name}
                      onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                      required
                      className="border-border/60 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-email">Email Address</Label>
                    <Input
                      id="staff-email"
                      type="email"
                      placeholder="vikram@sheetsandcovers.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                      required
                      className="border-border/60 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={createForm.role}
                      onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v as Role }))}
                    >
                      <SelectTrigger className="w-full h-11 border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STAFF">STAFF (Orders, Inventory, Production)</SelectItem>
                        <SelectItem value="OWNER">OWNER (Full administrative access)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-password">Temporary Password</Label>
                    <Input
                      id="staff-password"
                      type="password"
                      placeholder="••••••••"
                      value={createForm.password}
                      onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                      required
                      minLength={6}
                      className="border-border/60 h-11"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                      className="border-border/60 h-11"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating} className="h-11">
                      {creating ? "Creating…" : "Create Account"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-border/60 bg-background/95">
          <TabsTrigger value="staff" className="gap-2">
            <HugeiconsIcon icon={UserGroupIcon} size={16} />
            Staff Accounts ({users.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <HugeiconsIcon icon={ActivityIcon} size={16} />
            Audit Activity Log ({logs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <Card className="border-border/60 bg-background/95 shadow-sm">
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <p className="text-muted-foreground py-12 text-center text-sm">
                  No staff accounts found.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60">
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Name</TableHead>
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Email</TableHead>
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Role</TableHead>
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Active</TableHead>
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Joined</TableHead>
                      <TableHead className="h-12 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className="transition-colors hover:bg-muted/10">
                        <TableCell className="font-medium py-3.5">
                          {u.name}
                          {u.id === currentUser?.id ? (
                            <span className="text-muted-foreground ml-2 text-xs">
                              (you)
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm py-3.5">{u.email}</TableCell>
                        <TableCell className="py-3.5">
                          <Select
                            value={u.role}
                            onValueChange={(v) =>
                              handleUpdate(u, { role: v as Role })
                            }
                            disabled={savingId === u.id || u.id === currentUser?.id}
                          >
                            <SelectTrigger className="w-32 h-9 border-border/60">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OWNER">OWNER</SelectItem>
                              <SelectItem value="STAFF">STAFF</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Switch
                            checked={u.isActive}
                            disabled={savingId === u.id || u.id === currentUser?.id}
                            onCheckedChange={(checked) =>
                              handleUpdate(u, { isActive: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm py-3.5">
                          {formatDate(u.createdAt)}
                        </TableCell>
                        <TableCell className="text-right py-3.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewUserActivity(u.email)}
                            className="h-8 text-xs border-border/60"
                          >
                            <HugeiconsIcon icon={ActivityIcon} size={14} />
                            Activity
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="border-border/60 bg-background/95 shadow-sm">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-56 h-10 border-border/60">
                    <SelectValue placeholder="Filter by user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All users</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground text-xs">
                  {filteredLogs.length} event{filteredLogs.length === 1 ? "" : "s"}
                </span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                <p className="text-muted-foreground py-12 text-center text-sm">
                  No activity recorded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60">
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">When</TableHead>
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">User</TableHead>
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Action</TableHead>
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Entity</TableHead>
                      <TableHead className="h-12 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="transition-colors hover:bg-muted/10">
                        <TableCell className="text-muted-foreground whitespace-nowrap text-sm py-3.5">
                          {formatDateTime(log.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm py-3.5">
                          <div className="font-medium">{log.user?.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {log.user?.role}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge variant="outline" className="border-border/60">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs py-3.5">
                          {log.entityType} · {log.entityId.slice(0, 8)}…
                        </TableCell>
                        <TableCell className="text-xs py-3.5">
                          {renderDetails(log.details)}
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
    </div>
  );
}
