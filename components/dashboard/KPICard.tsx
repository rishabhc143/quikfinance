import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

export function KPICard({
  label,
  value,
  change,
  tone,
  href,
  kind = "money"
}: {
  label: string;
  value: number;
  change: string;
  tone: "good" | "warn" | "neutral";
  href?: string;
  kind?: "money" | "number";
}) {
  const Icon = tone === "good" ? ArrowUpRight : tone === "warn" ? ArrowDownRight : Minus;
  const toneClass = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-muted-foreground";

  const content = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{kind === "number" ? new Intl.NumberFormat("en-IN").format(value) : formatMoney(value)}</div>
        <div className={`mt-2 inline-flex items-center text-xs font-semibold ${toneClass}`}>
          <Icon className="mr-1 h-3.5 w-3.5" />
          {change}
        </div>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="transition hover:-translate-y-0.5 hover:shadow-soft">
      {content}
    </Link>
  ) : (
    content
  );
}
