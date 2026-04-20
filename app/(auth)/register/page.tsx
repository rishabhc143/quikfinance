"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [currency, setCurrency] = useState("USD");

  const getSupabase = () => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      toast.error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      return null;
    }
  };

  const register = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) {
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company,
          base_currency: currency
        }
      }
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email to verify your account.");
    router.push("/login");
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>Company, base currency, fiscal setup, and chart of accounts begin here.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={register} className="space-y-4">
          <div>
            <Label htmlFor="company">Company name</Label>
            <Input id="company" value={company} onChange={(event) => setCompany(event.target.value)} required className="mt-2" />
          </div>
          <div>
            <Label htmlFor="currency">Base currency</Label>
            <select id="currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {["USD", "INR", "EUR", "GBP"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-2" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-2" />
          </div>
          <Button type="submit" className="w-full">Create account</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already registered? <Link href="/login" className="font-semibold text-primary">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
