import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/role-gate";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Role } from "@/types";

export const Route = createFileRoute("/_app/admin/users")({
  component: () => (
    <RoleGate allow={["admin"]}>
      <UsersPage />
    </RoleGate>
  ),
});

const ALL_ROLES: Role[] = ["admin", "manager", "faculty", "student"];

interface Row {
  id: string;
  full_name: string | null;
  email: string | null;
  roles: Role[];
}

function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map<string, Role[]>();
    (roles ?? []).forEach((r) => {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role as Role);
      map.set(r.user_id, arr);
    });
    setRows(
      (profiles ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        roles: map.get(p.id) ?? [],
      })),
    );
    setBusy(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (userId: string, role: Role, has: boolean) => {
    if (has) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users &amp; Roles</h1>
        <Button variant="outline" onClick={load} disabled={busy}>Refresh</Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              {ALL_ROLES.map((r) => (
                <TableHead key={r} className="text-center capitalize">{r}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.full_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                {ALL_ROLES.map((r) => {
                  const has = u.roles.includes(r);
                  return (
                    <TableCell key={r} className="text-center">
                      <Checkbox checked={has} onCheckedChange={() => toggle(u.id, r, has)} />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={2 + ALL_ROLES.length} className="text-center text-sm text-muted-foreground py-8">
                  No users yet. New sign-ups appear here automatically.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground">
        Tip: tick at least one role per user. Without a role, RLS will block them from most data.
      </p>
    </div>
  );
}