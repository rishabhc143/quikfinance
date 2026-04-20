import type { NextRequest } from "next/server";
import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  const body = (await request.json()) as { bank_account_id?: string; matched_ids?: string[] };
  return ok({
    bank_account_id: body.bank_account_id ?? null,
    matched_ids: body.matched_ids ?? [],
    difference: 0,
    reconciled_by: auth.context.userId
  });
}
