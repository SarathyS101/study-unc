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



export default function SignUpForm() {
  // ─── State ───
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Handle “Send Magic Link” ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalized = email.trim().toLowerCase();
    // 1) Domain check
    if (!normalized.endsWith("@ad.unc.edu")) {
      setErrorMessage("You must use a valid @ad.unc.edu email.");
      return;
    }

    setLoading(true);
    // 2) Request Supabase to send magic link, with redirect back to “/”
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { emailRedirectTo: window.location.origin + "/check-rooms" }
    });
    setLoading(false);

    if (error) {
      console.error(error);
      setErrorMessage("Failed to send magic link. Please try again.");
      return;
    }

    // 3) Tell the user to check their inbox
    setSuccessMessage(
      `✅ Magic link sent! Check your inbox at ${normalized}.`
    );
  };

  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card>
        <CardHeader>
          <CardTitle>Sign‐in</CardTitle>
          <CardDescription>
            Enter your <code>@ad.unc.edu</code> email and we’ll send a magic link.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Email Input */}
            <div className="grid gap-3">
              <Label htmlFor="email">UNC Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="johndoe@ad.unc.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Error / Success Messages */}
            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
            {successMessage && (
              <p className="text-sm text-green-600">{successMessage}</p>
            )}

            {/* Send Magic Link Button */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending link…" : "Send Magic Link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
