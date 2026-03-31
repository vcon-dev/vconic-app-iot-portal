import React, { useEffect } from "react";
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
import { useGetRule, useUpdateRule, useDeleteRule, getListRulesQueryKey, getGetRuleQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const headerSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  targetUrl: z.string().url("Must be a valid URL"),
  method: z.enum(["POST", "PUT"]),
  headersArray: z.array(headerSchema).optional(),
  filterCondition: z.string().optional(),
  enabled: z.boolean(),
});

export default function RuleEdit({ params }: { params: { ruleId: string } }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: rule, isLoading } = useGetRule(params.ruleId);
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      name: "", 
      targetUrl: "", 
      method: "POST",
      headersArray: [],
      filterCondition: "",
      enabled: true
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "headersArray",
  });

  useEffect(() => {
    if (rule) {
      const headersArr = rule.headers ? Object.entries(rule.headers).map(([key, value]) => ({ key, value })) : [];
      form.reset({
        name: rule.name,
        targetUrl: rule.targetUrl,
        method: rule.method as any,
        headersArray: headersArr,
        filterCondition: rule.filterCondition || "",
        enabled: rule.enabled,
      });
    }
  }, [rule, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
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
    };

    updateRule.mutate({ ruleId: params.ruleId, data: payload as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRuleQueryKey(params.ruleId) });
        toast.success("Routing rule updated");
        setLocation("/rules");
      },
      onError: (err: any) => {
        toast.error(err.data?.message || "Failed to update rule");
      }
    });
  };

  const handleDelete = () => {
    deleteRule.mutate({ ruleId: params.ruleId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
        toast.success("Rule deleted");
        setLocation("/rules");
      }
    });
  };

  if (isLoading) {
    return <div className="text-primary font-mono animate-pulse">LOADING RULE SCHEMATICS...</div>;
  }

  if (!rule) return <div>Rule not found</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/rules")} className="rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Edit Rule: {rule.name}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs">Target: {rule.deviceId ? (rule.deviceName || rule.deviceId) : "GLOBAL"}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
              <AlertDialogDescription>
                This routing rule will be permanently removed. Future payloads will not be delivered to this endpoint.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Rule
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Rule Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <Input className="font-mono" {...field} />
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
                    <FormLabel>Filter Condition (JSONPath / Regex)</FormLabel>
                    <FormControl>
                      <Input className="font-mono" {...field} />
                    </FormControl>
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
                          <Input placeholder="Key" className="font-mono" {...field} />
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
                          <Input placeholder="Value" className="font-mono" {...field} />
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
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => setLocation("/rules")}>Cancel</Button>
              <Button type="submit" disabled={updateRule.isPending}>
                {updateRule.isPending ? "UPDATING..." : "UPDATE ROUTE"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
