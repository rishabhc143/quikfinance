"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/hooks/useDashboard";
import { formatMoney } from "@/lib/utils/currency";

export function RevenueChart({ data }: { data: DashboardData["revenueExpense"] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Revenue vs Expenses</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} />
            <Tooltip formatter={(value: number) => formatMoney(value)} />
            <Legend />
            <Bar dataKey="revenue" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
