import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RoleGate } from "@/components/role-gate";
import {
  getDashboardStats, getDateWiseEvaluation, getTimeWiseEvaluation,
} from "@/lib/api/dashboard";
import type { DashboardStats } from "@/types";

export const Route = createFileRoute("/_app/dashboard")({
  component: () => (
    <RoleGate allow={["admin", "manager"]}>
      <Dashboard />
    </RoleGate>
  ),
});

const COLORS = ["#16a34a", "#eab308", "#3b82f6", "#22c55e", "#ef4444"];

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dateData, setDateData] = useState<{ date: string; count: number }[]>([]);
  const [timeData, setTimeData] = useState<{ hour: string; count: number }[]>([]);

  useEffect(() => {
    getDashboardStats().then(setStats);
    getDateWiseEvaluation().then(setDateData);
    getTimeWiseEvaluation().then(setTimeData);
  }, []);

  const pieData = stats
    ? [
        { name: "Pending", value: stats.pending },
        { name: "Allocated", value: stats.allocated },
        { name: "Partially Evaluated", value: stats.partial },
        { name: "Evaluated", value: stats.evaluated },
        { name: "Rejected", value: stats.rejected },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Charts</h1>
          <p className="text-sm text-muted-foreground">OSM Reports / Dashboard</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL</SelectItem>
              <SelectItem value="ug">UG</SelectItem>
              <SelectItem value="pg">PG</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="eng">
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="eng">Engineering</SelectItem>
              <SelectItem value="com">Commerce</SelectItem>
              <SelectItem value="sci">Science</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Over All Evaluation Details</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evaluated</TableHead>
                <TableHead>Partially</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Rejected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{stats?.evaluated ?? "-"}</TableCell>
                <TableCell>{stats?.partial ?? "-"}</TableCell>
                <TableCell>{stats?.pending ?? "-"}</TableCell>
                <TableCell>{stats?.allocated ?? "-"}</TableCell>
                <TableCell>{stats?.rejected ?? "-"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">RowsPerPage 10 · 1-1 of 1</p>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Script Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="middle" align="right" layout="vertical" />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Date Wise Evaluation Details</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dateData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Time Wise Evaluation Details</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#93c5fd" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}