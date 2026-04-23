import Link from "next/link";
import { MessageCircle, ExternalLink } from "lucide-react";
import { FloatingSupportChat } from "@/components/portals/FloatingSupportChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { requireApiContext } from "@/lib/api/auth";
import { createPortalUrl } from "@/lib/portals";

export const dynamic = "force-dynamic";

export default async function ChatbotPage() {
  const auth = await requireApiContext();

  if (!auth.ok) {
    return (
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Customer Chatbot" description="Sign in to open customer portal chatbot links." />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">{auth.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: portal } = await auth.context.supabase
    .from("portal_links")
    .select("id, access_token, display_name, email, created_at")
    .eq("org_id", auth.context.orgId)
    .eq("portal_type", "customer")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const portalUrl = typeof portal?.access_token === "string" ? createPortalUrl("customer", portal.access_token) : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Customer Chatbot"
        description="Open the customer portal support assistant from here. This is where customers ask invoice, payment, order, refund, and support questions."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Support Assistant Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {portalUrl ? (
            <>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold">{portal?.display_name ?? "Customer portal"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{portal?.email ?? "Customer email not set"}</p>
                <p className="mt-3 break-all rounded-xl bg-background p-3 text-xs text-muted-foreground">{portalUrl}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                You should also see the floating chatbot button at the bottom-right of this page. Click <strong>Need help?</strong> to test it.
              </div>
              <Button asChild>
                <Link href={portalUrl} target="_blank">
                  Open Chatbot
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed p-5">
              <p className="font-semibold">No customer portal link yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a customer portal link first, then return here to open the chatbot.
              </p>
              <Button asChild className="mt-4">
                <Link href="/settings/portals">Create Portal Link</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {portal?.access_token ? (
        <FloatingSupportChat token={portal.access_token} customerName={portal.display_name ?? "Customer"} />
      ) : null}
    </div>
  );
}
