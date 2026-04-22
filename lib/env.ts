export function getPublicEnv() {
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabasePublishableKey,
    supabaseAnonKey: supabasePublishableKey,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  };
}

export function getServerEnv() {
  return {
    ...getPublicEnv(),
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    openaiSupportModel: process.env.OPENAI_SUPPORT_MODEL ?? "gpt-5-mini",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? ""
  };
}
