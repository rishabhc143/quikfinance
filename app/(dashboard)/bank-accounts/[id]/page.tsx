import { BankAccountDetailWorkspace } from "@/components/banking/BankAccountDetailWorkspace";

export default function BankAccountDetailPage({ params }: { params: { id: string } }) {
  return <BankAccountDetailWorkspace id={params.id} />;
}
