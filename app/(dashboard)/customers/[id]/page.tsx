import { ContactProfile } from "@/components/contacts/ContactProfile";

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  return <ContactProfile kind="customer" id={params.id} />;
}
