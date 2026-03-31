import React from "react";
import { Link } from "wouter";
import { useListRules, useUpdateRule } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, GitMerge, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListRulesQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";

export default function RulesList() {
  const { data, isLoading } = useListRules();
  const updateRule = useUpdateRule();
  const queryClient = useQueryClient();

  if (isLoading) {
    return <div className="text-primary font-mono animate-pulse">LOADING ROUTING TABLE...</div>;
  }

  const rules = data?.rules || [];

  const handleToggle = (ruleId: string, enabled: boolean) => {
    updateRule.mutate({ ruleId, data: { enabled } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
        toast.success(`Rule ${enabled ? 'enabled' : 'disabled'}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Routing Rules</h1>
          <p className="text-muted-foreground mt-1">Configure Webhook destinations for incoming vCons</p>
        </div>
        <Button asChild>
          <Link href="/rules/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Rule
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id} className={`bg-card border-border/50 transition-all ${!rule.enabled ? 'opacity-60 grayscale' : ''}`}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <GitMerge className={`h-5 w-5 ${rule.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Link href={`/rules/${rule.id}`} className="text-lg font-bold hover:text-primary transition-colors">
                      {rule.name}
                    </Link>
                    {rule.deviceId && <Badge variant="outline" className="font-mono text-xs">Target: {rule.deviceName || rule.deviceId}</Badge>}
                    {!rule.deviceId && <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">Target: GLOBAL</Badge>}
                  </div>
                  
                  <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground bg-black/30 p-2 rounded w-fit border border-border/50">
                    <span className="font-bold text-blue-400">{rule.method}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="truncate max-w-[300px] md:max-w-md xl:max-w-xl">{rule.targetUrl}</span>
                  </div>
                  
                  {rule.filterCondition && (
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      <span className="opacity-50">FILTER:</span> {rule.filterCondition}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <CheckCircle2 className="h-3 w-3 text-primary" /> 
                      <span className="w-16">SUCCESS:</span> 
                      <span className="text-primary">{rule.successCount}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <XCircle className="h-3 w-3 text-destructive" /> 
                      <span className="w-16">FAILED:</span> 
                      <span className="text-destructive">{rule.failureCount}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <Switch 
                      checked={rule.enabled} 
                      onCheckedChange={(c) => handleToggle(rule.id, c)}
                    />
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">
                      {rule.enabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {rules.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-lg bg-card/20">
            <GitMerge className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No routing rules configured</h3>
            <p className="text-sm text-muted-foreground text-center mt-1 mb-4">Create a rule to forward incoming vCons to your backend services.</p>
            <Button asChild variant="outline">
              <Link href="/rules/new">Create First Rule</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
