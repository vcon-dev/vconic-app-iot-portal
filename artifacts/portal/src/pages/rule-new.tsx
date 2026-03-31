import React from "react";
import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useCreateRule, getListRulesQueryKey, useListDevices } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

const headerSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  deviceId: z.string().optional(),
  targetUrl: z.string().url("Must be a valid URL"),
  method: z.enum(["POST", "PUT"]),
  headersArray: z.array(headerSchema).optional(),
  filterCondition: z.string().optional(),
  enabled: z.boolean().default(true),
});

export default function RuleNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createRule = useCreateRule();
  const { data: deviceData } = useListDevices();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      name: "", 
      deviceId: "global", 
      targetUrl: "", 
      method: "POST",
      headersArray: [{ key: "Content-Type", value: "application/json" }],
      filterCondition: "",
      enabled: true
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "headersArray",
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Transform headersArray to object
    const headers: Record<string, string> = {};
    if (values.headersArray) {
      values.headersArray.forEach(h => {
        headers[h.key] = h.value;
      });
    }

    const payload = {
      name: values.name,
      targetUrl: values.targetUrl,
      method: values.method,
      headers,
      enabled: values.enabled,
      filterCondition: values.filterCondition || undefined,
      deviceId: values.deviceId === "global" ? undefined : values.deviceId
    };

    createRule.mutate({ data: payload as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
        toast.success("Routing rule created successfully");
        setLocation("/rules");
      },
      onError: (err: any) => {
        toast.error(err.data?.message || "Failed to create rule");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/rules")} className="rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Routing Rule</h1>
          <p className="text-muted-foreground mt-1">Define webhook delivery for incoming vCons</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Rule Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Name</FormLabel>
                      <FormControl>
                        <Input placeholder="CRM Sync" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="deviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Source</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-mono">
                            <SelectValue placeholder="Select target" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="global" className="font-bold text-primary">Global (All Devices)</SelectItem>
                          {deviceData?.devices.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 items-start">
                <FormField
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-mono">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="targetUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Webhook URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.yourdomain.com/vcons" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="filterCondition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Filter Condition (JSONPath / Regex) <span className="text-muted-foreground text-xs ml-2 font-normal">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="$.dialog[?(@.type=='recording')]" className="font-mono" {...field} />
                    </FormControl>
                    <FormDescription>Only send if vCon matches this rule.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>HTTP Headers</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ key: "", value: "" })} className="gap-2">
                <Plus className="h-3 w-3" /> Add Header
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`headersArray.${index}.key`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Header Key" className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`headersArray.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-[2]">
                        <FormControl>
                          <Input placeholder="Header Value" className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {fields.length === 0 && (
                <div className="text-sm text-muted-foreground font-mono text-center py-4 border border-dashed border-border/50 rounded">
                  No custom headers defined
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/50 bg-card/50 p-4 w-64 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-bold">Rule Active</FormLabel>
                    <FormDescription>Enable delivery</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => setLocation("/rules")}>Cancel</Button>
              <Button type="submit" disabled={createRule.isPending}>
                {createRule.isPending ? "SAVING..." : "SAVE ROUTE"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
