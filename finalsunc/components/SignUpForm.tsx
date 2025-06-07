// app/login/SignupForm.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function SignUpForm() {
  // ─── State ───
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<boolean>(false);

  // ─── Handle “Send Magic Link” ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const normalized = email.trim().toLowerCase();
    // 1) Domain check
    if (!normalized.endsWith("@ad.unc.edu")) {
      setErrorMessage("You must use a valid @ad.unc.edu email.");
      return;
    }

    // 2) If on cooldown, block the attempt
    if (cooldown) {
      toast("⌛ Please wait 30 seconds before trying again.");
      return;
    }

    setLoading(true);

    // 3) Request Supabase to send magic link, with redirect back to “/check-rooms”
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { emailRedirectTo: window.location.origin + "/check-rooms" },
    });
    setLoading(false);

    if (error) {
      console.error(error);
      toast("❌ Failed to send magic link. Please try again.");
      return;
    }

    // 4) On success: notify user and start 30s cooldown
    toast(`✅ Magic link sent! Check ${normalized}. Wait 30 seconds before retry.`);
    setCooldown(true);
    setTimeout(() => {
      setCooldown(false);
      toast("🔓 You can request a new magic link now.");
    }, 30_000);
  };

  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card>
        <CardHeader>
          <CardTitle>{"Sign‐in"}</CardTitle>
          <CardDescription>
            {"Enter your"} {<code>{"@ad.unc.edu"}</code>} {"email and we’ll send a magic link."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Email Input */}
            <div className="grid gap-3">
              <Label htmlFor="email">{"UNC Email"}</Label>
              <Input
                id="email"
                type="email"
                placeholder="johndoe@ad.unc.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={cooldown}
              />
              {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
              )}
            </div>

            {/* Send Magic Link Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || cooldown}
            >
              {loading
                ? "Sending link…"
                : cooldown
                ? "Wait 30 seconds"
                : "Send Magic Link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
