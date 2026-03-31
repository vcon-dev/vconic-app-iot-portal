import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";

const formSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
}).refine((data) => data.password === data.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

function getTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  const token = getTokenFromUrl();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!token) {
      toast.error("No reset token found in URL");
      return;
    }
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      const data = await res.json();
      if (res.status === 400 || res.status === 404) {
        setInvalidToken(true);
        return;
      }
      if (!res.ok) {
        toast.error(data.message || "Something went wrong");
        return;
      }
      setSuccess(true);
      setTimeout(() => setLocation("/login"), 3000);
    } catch {
      toast.error("Network error — please try again");
    }
  };

  if (!token || invalidToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center text-center">
            <Logo className="mb-6" />
          </div>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center py-4">
                <AlertTriangle className="w-10 h-10 text-yellow-500" />
                <h3 className="font-bold text-lg">Invalid or expired link</h3>
                <p className="text-sm text-muted-foreground">
                  This password reset link is invalid or has already been used. Reset links expire after 1 hour.
                </p>
              </div>
              <Link href="/forgot-password">
                <Button className="w-full font-mono font-bold">REQUEST NEW LINK</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 relative">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col items-center text-center">
          <Logo className="mb-6" />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Set New Password</h2>
          <p className="text-muted-foreground mt-2">Choose a strong password for your account</p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl relative z-10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              New Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4 text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
                <h3 className="font-bold text-lg">Password updated</h3>
                <p className="text-sm text-muted-foreground">Redirecting you to login...</p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Min. 8 characters" className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Repeat password" className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full font-mono font-bold" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "UPDATING..." : "UPDATE PASSWORD"}
                  </Button>
                </form>
              </Form>
            )}

            {!success && (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline underline-offset-4 flex items-center justify-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Back to login
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
