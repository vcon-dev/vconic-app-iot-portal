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
import { KeyRound, ArrowLeft, Mail } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const portalOrigin = `${window.location.origin}${base}`;
      const res = await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, portalOrigin }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Something went wrong");
        return;
      }
      setSubmittedEmail(values.email);
      setSubmitted(true);
    } catch {
      toast.error("Network error — please try again");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 relative">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col items-center text-center">
          <Logo className="mb-6" />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Reset Password</h2>
          <p className="text-muted-foreground mt-2">
            {submitted ? "Check your inbox" : "Enter your account email to receive a reset link"}
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl relative z-10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Password Recovery
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!submitted ? (
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
                    {form.formState.isSubmitting ? "SENDING..." : "SEND RESET LINK"}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4 py-2">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Mail className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Email sent to</p>
                    <p className="font-mono text-primary text-sm mt-1">{submittedEmail}</p>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Click the link in the email to set a new password. The link expires in <span className="text-foreground font-mono">1 hour</span>.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => { setSubmitted(false); form.reset(); }}
                >
                  Try a different email
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
