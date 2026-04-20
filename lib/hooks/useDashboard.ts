"use client";

import { useQuery } from "@tanstack/react-query";

export type DashboardData = {
  kpis: { label: string; value: number; change: string; tone: "good" | "warn" | "neutral" }[];
  revenueExpense: { month: string; revenue: number; expenses: number }[];
  cashFlow: { date: string; cash: number }[];
  aging: { name: string; value: number }[];
  feed: { id: string; label: string; amount: number; date: string }[];
};

export const fallbackDashboard: DashboardData = {
  kpis: [
    { label: "Total Revenue MTD", value: 143800, change: "+18.4%", tone: "good" },
    { label: "Outstanding Receivables", value: 24120, change: "9 invoices", tone: "warn" },
    { label: "Bills Due", value: 3280, change: "2 due this week", tone: "warn" },
    { label: "Net Cash Position", value: 102570, change: "+29.6k", tone: "good" }
  ],
  revenueExpense: [
    { month: "Nov", revenue: 83000, expenses: 51200 },
    { month: "Dec", revenue: 91800, expenses: 53400 },
    { month: "Jan", revenue: 104200, expenses: 61200 },
    { month: "Feb", revenue: 112400, expenses: 65500 },
    { month: "Mar", revenue: 128600, expenses: 70200 },
    { month: "Apr", revenue: 143800, expenses: 96200 }
  ],
  cashFlow: [
    { date: "Jan", cash: 62400 },
    { date: "Feb", cash: 68800 },
    { date: "Mar", cash: 72970 },
    { date: "Apr", cash: 102570 }
  ],
  aging: [
    { name: "Current", value: 3200 },
    { name: "1-30", value: 232000 },
    { name: "31-60", value: 0 },
    { name: "60+", value: 0 }
  ],
  feed: [
    { id: "feed-1", label: "Payment received from Northstar Labs", amount: 4000, date: "Today" },
    { id: "feed-2", label: "Bill approved for Metro Cloud Hosting", amount: -1180, date: "Today" },
    { id: "feed-3", label: "Expense posted for client travel", amount: -640, date: "Apr 20" }
  ]
};

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/v1/dashboard");
      if (!response.ok) {
        return fallbackDashboard;
      }
      const payload = (await response.json()) as { data?: DashboardData };
      return payload.data ?? fallbackDashboard;
    },
    initialData: fallbackDashboard
  });
}
