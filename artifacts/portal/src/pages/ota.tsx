import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Cpu, Upload, CheckCircle2, AlertTriangle, Loader2, FileCode2, Tag, Globe } from "lucide-react";
import { toast } from "sonner";

function getToken() { return localStorage.getItem("vconic_token"); }

interface OtaStatus {
  version: string | null;
  firmwarePresent: boolean;
  firmwareSize: number | null;
  firmwareModified: string | null;
}

async function fetchStatus(): Promise<OtaStatus> {
  const res = await fetch("/api/ota/status", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to load OTA status");
  return res.json();
}

async function putVersion(version: string): Promise<void> {
  const res = await fetch("/api/ota/version", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ version }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
}

async function uploadFirmware(file: File): Promise<void> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const firmwareBase64 = btoa(binary);

  const res = await fetch("/api/ota/firmware", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ firmwareBase64 }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export default function OtaPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newVersion, setNewVersion] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["ota-status"], queryFn: fetchStatus });

  const versionMutation = useMutation({
    mutationFn: () => putVersion(newVersion.trim()),
    onSuccess: () => {
      toast.success("Version updated");
      setNewVersion("");
      qc.invalidateQueries({ queryKey: ["ota-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const firmwareMutation = useMutation({
    mutationFn: () => uploadFirmware(selectedFile!),
    onSuccess: () => {
      toast.success("Firmware uploaded");
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["ota-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deployedHost = window.location.origin;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">OTA Firmware</h1>
        <p className="text-muted-foreground mt-1">Over-the-air update management for ESP32 devices</p>
      </div>

      {/* Status card */}
      <Card className="bg-card border-border/50">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Current OTA State
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md bg-secondary/50 border border-border p-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Active Version
                </p>
                <p className="text-2xl font-bold font-mono">
                  {data?.version ?? <span className="text-muted-foreground text-lg">not set</span>}
                </p>
              </div>
              <div className="rounded-md bg-secondary/50 border border-border p-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-1">
                  <FileCode2 className="h-3 w-3" /> Firmware Binary
                </p>
                {data?.firmwarePresent ? (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="font-mono font-semibold text-green-400">Present</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatBytes(data.firmwareSize!)} · {new Date(data.firmwareModified!).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="font-mono text-yellow-500">Not uploaded</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device endpoints */}
      <Card className="bg-card border-border/50">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Device Endpoints
          </CardTitle>
          <CardDescription>
            Use these URLs in your firmware's <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">config.h</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
          {[
            { label: "OTA_VERSION_URL", path: "/version.txt" },
            { label: "OTA_FIRMWARE_URL", path: "/firmware.bin" },
          ].map(({ label, path }) => (
            <div key={label}>
              <p className="text-xs font-mono text-muted-foreground mb-1">{label}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-secondary/60 border border-border rounded px-3 py-2 text-sm font-mono text-primary break-all">
                  {deployedHost}{path}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => { navigator.clipboard.writeText(`${deployedHost}${path}`); toast.success("Copied"); }}
                >
                  Copy
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Both endpoints are public — no authentication required. The ESP32 HTTPClient fetches them directly on boot.
          </p>
        </CardContent>
      </Card>

      {/* Upload firmware */}
      <Card className="bg-card border-border/50">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Firmware
          </CardTitle>
          <CardDescription>
            Build via Arduino IDE: <strong>Sketch › Export Compiled Binary</strong>, then upload the <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">.bin</code> file here.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firmware-file">Firmware binary (.bin)</Label>
            <Input
              id="firmware-file"
              ref={fileRef}
              type="file"
              accept=".bin,application/octet-stream"
              className="bg-secondary border-border cursor-pointer"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            {selectedFile && (
              <p className="text-xs text-muted-foreground font-mono">
                {selectedFile.name} — {formatBytes(selectedFile.size)}
              </p>
            )}
          </div>
          <Button
            onClick={() => firmwareMutation.mutate()}
            disabled={!selectedFile || firmwareMutation.isPending}
            className="gap-2"
          >
            {firmwareMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {firmwareMutation.isPending ? "Uploading…" : "Upload firmware.bin"}
          </Button>
        </CardContent>
      </Card>

      {/* Update version */}
      <Card className="bg-card border-border/50">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Update Version String
          </CardTitle>
          <CardDescription>
            Must exactly match <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">FIRMWARE_VERSION</code> in your firmware's <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">config.h</code>. Update this <em>after</em> uploading the new binary.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-500/5 border border-yellow-500/20 text-yellow-400 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Upload the new firmware binary first, then update the version. This prevents devices from downloading a missing file.
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">New version (semver)</Label>
            <div className="flex gap-3">
              <Input
                id="version"
                placeholder={data?.version ?? "1.0.0"}
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                className="bg-secondary border-border max-w-48 font-mono"
              />
              <Button
                onClick={() => versionMutation.mutate()}
                disabled={!newVersion.trim() || versionMutation.isPending}
              >
                {versionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
