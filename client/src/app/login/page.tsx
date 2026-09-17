"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { PackageIcon } from "@/lib/hugeicons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await api("/auth/signup", {
          method: "POST",
          body: { name, email, password },
        });
        toast.success("Owner account created", {
          description: "You can now sign in.",
        });
        setMode("login");
      } else {
        await login(email, password);
        toast.success("Welcome back!");
        router.replace("/dashboard");
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background flex min-h-screen">
      {/* Brand panel */}
      <div className="bg-sidebar relative hidden w-1/2 flex-col justify-between border-r p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
            <HugeiconsIcon icon={PackageIcon} size={22} />
          </div>
          <span className="text-lg font-semibold">Sheets & Covers ERP</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold tracking-tight">
            Run your sheet cover manufacturing business end to end.
          </h1>
          <p className="text-muted-foreground mt-4 max-w-md text-base">
            Products, orders, inventory, production and finance — one ledger,
            one source of truth.
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} Sheets & Covers ERP
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center p-6 lg:w-1/2">
        <div className="absolute top-4 right-4">
          <ThemeSwitcher />
        </div>

        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">
              {mode === "login" ? "Sign in" : "Create owner account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Enter your credentials to access the dashboard."
                : "Signup is only available for the first owner account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    placeholder="Amritesh Rai"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="owner@sheetsandcovers.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign in"
                    : "Create account"}
              </Button>
            </form>

            <Separator className="my-4" />

            <p className="text-muted-foreground text-center text-sm">
              {mode === "login" ? (
                <>
                  First time here?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary font-medium underline-offset-4 hover:underline"
                  >
                    Create owner account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary font-medium underline-offset-4 hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
