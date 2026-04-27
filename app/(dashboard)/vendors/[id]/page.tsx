import { ContactProfile } from "@/components/contacts/ContactProfile";

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  return <ContactProfile kind="vendor" id={params.id} />;
}
