import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Loader2, Database, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

function getToken() { return localStorage.getItem("vconic_token"); }

interface UserSettings {
  maxVconCount: number;
  currentVconCount: number;
  updatedAt: string;
}

async function fetchSettings(): Promise<UserSettings> {
  const res = await fetch("/api/settings", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

async function saveSettings(data: { maxVconCount: number }): Promise<UserSettings> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to save settings");
  }
  return res.json();
}

export default function Settings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [maxVconCount, setMaxVconCount] = useState<string>("");

  useEffect(() => {
    if (data) setMaxVconCount(String(data.maxVconCount));
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => saveSettings({ maxVconCount: Number(maxVconCount) }),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const usagePct = data ? Math.min(100, (data.currentVconCount / data.maxVconCount) * 100) : 0;
  const isNearLimit = usagePct >= 80;
  const isAtLimit = usagePct >= 100;

  const isDirty = data ? Number(maxVconCount) !== data.maxVconCount : false;
  const isValid = Number.isInteger(Number(maxVconCount)) && Number(maxVconCount) >= 1 && Number(maxVconCount) <= 1_000_000;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage storage limits and account preferences</p>
      </div>

      {/* Storage Card */}
      <Card className="bg-card border-border/50">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            vCon Storage Limit
          </CardTitle>
          <CardDescription>
            When the archive reaches its limit, the oldest vCons are automatically deleted to make room for new ones.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              {/* Usage bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current usage</span>
                  <span className={`font-mono font-semibold ${isAtLimit ? "text-destructive" : isNearLimit ? "text-yellow-500" : "text-foreground"}`}>
                    {data?.currentVconCount.toLocaleString()} / {data?.maxVconCount.toLocaleString()} vCons
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isAtLimit ? "bg-destructive" : isNearLimit ? "bg-yellow-500" : "bg-primary"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                {isNearLimit && !isAtLimit && (
                  <p className="text-xs text-yellow-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Approaching storage limit — oldest vCons will be purged soon
                  </p>
                )}
                {isAtLimit && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Storage limit reached — oldest vCons are being automatically removed
                  </p>
                )}
              </div>

              {/* Limit input */}
              <div className="space-y-2">
                <Label htmlFor="maxVconCount">Maximum vCon Count</Label>
                <div className="flex gap-3">
                  <Input
                    id="maxVconCount"
                    type="number"
                    min={1}
                    max={1000000}
                    value={maxVconCount}
                    onChange={(e) => setMaxVconCount(e.target.value)}
                    className="bg-secondary border-border max-w-48 font-mono"
                  />
                  <Button
                    onClick={() => mutation.mutate()}
                    disabled={!isDirty || !isValid || mutation.isPending}
                  >
                    {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Between 1 and 1,000,000. Default is 1,000.
                </p>
              </div>

              {data?.updatedAt && (
                <p className="text-xs text-muted-foreground border-t border-border/50 pt-4">
                  Last updated: {new Date(data.updatedAt).toLocaleString()}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
