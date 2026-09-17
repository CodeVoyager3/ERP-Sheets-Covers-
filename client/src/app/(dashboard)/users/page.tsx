"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>("ALL");
  const [savingId, setSavingId] = useState<string | null>(null);

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
      toast.success(`${target.name} updated`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update user");
      await load();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Users & Activity"
        description="Manage staff accounts and monitor the full audit trail of every action."
      />

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="activity">Activity log</TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <Card>
            <CardContent>
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <p className="text-muted-foreground py-12 text-center text-sm">
                  No staff accounts yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.name}
                          {u.id === currentUser?.id ? (
                            <span className="text-muted-foreground ml-2 text-xs">
                              (you)
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm">{u.email}</TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(v) =>
                              handleUpdate(u, { role: v as Role })
                            }
                            disabled={savingId === u.id || u.id === currentUser?.id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OWNER">OWNER</SelectItem>
                              <SelectItem value="STAFF">STAFF</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={u.isActive}
                            disabled={savingId === u.id || u.id === currentUser?.id}
                            onCheckedChange={(checked) =>
                              handleUpdate(u, { isActive: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-sm">
                          {formatDate(u.createdAt)}
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
          <Card>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-56">
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
                <span className="text-muted-foreground ml-auto text-sm">
                  {filteredLogs.length} event{filteredLogs.length === 1 ? "" : "s"}
                </span>
              </div>

              {loading ? (
                <div className="space-y-3 p-4">
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
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                          {formatDateTime(log.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{log.user?.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {log.user?.role}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {log.entityType} · {log.entityId.slice(0, 8)}…
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
