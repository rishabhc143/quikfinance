import { ExpenseDetail } from "@/components/transactions/ExpenseDetail";

export default function ExpenseDetailPage({ params }: { params: { id: string } }) {
  return <ExpenseDetail id={params.id} />;
}
