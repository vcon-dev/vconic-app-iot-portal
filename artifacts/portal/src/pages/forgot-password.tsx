import React, { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, ArrowLeft, Copy, CheckCircle2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function ForgotPassword() {
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Something went wrong");
        return;
      }
      if (data.token) {
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        const url = `${window.location.origin}${base}/reset-password?token=${data.token}`;
        setResetUrl(url);
      } else {
        toast.success("If that email is registered, a reset link has been sent.");
      }
    } catch {
      toast.error("Network error — please try again");
    }
  };

  const copyResetUrl = () => {
    if (!resetUrl) return;
    navigator.clipboard.writeText(resetUrl);
    setCopied(true);
    toast.success("Reset link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 relative">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col items-center text-center">
          <Logo className="mb-6" />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Reset Password</h2>
          <p className="text-muted-foreground mt-2">Enter your account email to generate a reset link</p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl relative z-10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Password Recovery
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!resetUrl ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="engineer@company.com" className="font-mono text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full font-mono font-bold" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "GENERATING LINK..." : "GENERATE RESET LINK"}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">Reset link generated</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy and open this link to set a new password. It expires in <span className="text-foreground font-mono">1 hour</span>.
                </p>
                <a
                  href={resetUrl}
                  target="_self"
                  className="block bg-black/50 rounded-md border border-border p-3 font-mono text-xs text-primary break-all hover:border-primary/50 transition-colors"
                >
                  {resetUrl}
                </a>
                <Button variant="outline" className="w-full gap-2" onClick={copyResetUrl}>
                  {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Reset Link"}
                </Button>
              </div>
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline underline-offset-4 flex items-center justify-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
