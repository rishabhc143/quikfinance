"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/hooks/useDashboard";
import { formatMoney } from "@/lib/utils/currency";

export function CashFlowWidget({ data }: { data: DashboardData["cashFlow"] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Cash Flow</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} />
            <Tooltip formatter={(value: number) => formatMoney(value)} />
            <Line type="monotone" dataKey="cash" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
