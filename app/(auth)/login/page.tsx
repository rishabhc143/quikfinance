"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const checkGoogleProvider = async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        setGoogleEnabled(false);
        return;
      }

      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
          headers: {
            apikey: supabaseKey
          }
        });
        const settings = (await response.json()) as { external?: { google?: boolean } };
        setGoogleEnabled(settings.external?.google === true);
      } catch {
        setGoogleEnabled(null);
      }
    };

    void checkGoogleProvider();
  }, []);

  const getSupabase = () => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      toast.error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      return null;
    }
  };

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) {
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next ?? "/");
  };

  const google = async () => {
    if (googleEnabled === false) {
      toast.error("Google sign-in is not enabled in Supabase yet. Enable Authentication -> Providers -> Google.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      return;
    }
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to continue managing your books.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={login} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-2" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-2" />
          </div>
          <Button type="submit" className="w-full">Sign in</Button>
          <Button type="button" variant="secondary" onClick={google} className="w-full">
            {googleEnabled === false ? "Google sign-in not enabled" : "Continue with Google"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          New here? <Link href="/register" className="font-semibold text-primary">Create an account</Link>
        </p>
      </CardContent>
    </Card>
  );
}
