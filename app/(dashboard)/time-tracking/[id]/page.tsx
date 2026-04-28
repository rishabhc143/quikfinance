import { TimeEntryDetail } from "@/components/operations/TimeEntryDetail";

export default function TimeEntryDetailPage({ params }: { params: { id: string } }) {
  return <TimeEntryDetail id={params.id} />;
}
