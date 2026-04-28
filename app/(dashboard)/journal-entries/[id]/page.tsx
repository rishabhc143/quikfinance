import { JournalEntryDetail } from "@/components/accounting/JournalEntryDetail";

export default function JournalEntryDetailPage({ params }: { params: { id: string } }) {
  return <JournalEntryDetail id={params.id} />;
}
