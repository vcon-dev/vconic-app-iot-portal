import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileJson, Paperclip, BrainCircuit, ChevronLeft, ChevronRight, Download, Tag } from "lucide-react";

const PAGE_SIZE = 25;

const TAG_COLORS = [
  "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "bg-amber-500/10 text-amber-400 border-amber-500/20",
];

function tagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_COLORS[hash % TAG_COLORS.length];
}

function getToken() { return localStorage.getItem("vconic_token"); }

async function downloadVcon(vconId: string, vconUuid: string) {
  const res = await fetch(`/api/vcons/${vconId}/download`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vcon-${vconUuid}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function fetchVcons(limit: number, offset: number) {
  const res = await fetch(`/api/vcons?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to load vCons");
  return res.json() as Promise<{ vcons: any[]; total: number }>;
}

export default function VconsList() {
  const [page, setPage] = useState(0);
  const offset = page * PAGE_SIZE;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["vcons", page],
    queryFn: () => fetchVcons(PAGE_SIZE, offset),
    placeholderData: (prev) => prev,
  });

  const vcons = data?.vcons || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = total === 0 ? 0 : offset + 1;
  const endItem = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">vCon Archive</h1>
          <p className="text-muted-foreground mt-1">Immutable conversation records</p>
        </div>
        {total > 0 && (
          <span className="text-sm text-muted-foreground font-mono">
            {total.toLocaleString()} total
          </span>
        )}
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">UUID</TableHead>
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">DEVICE</TableHead>
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">PARTIES</TableHead>
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">DURATION</TableHead>
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">TAGS</TableHead>
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">ROUTING</TableHead>
                <TableHead className="font-mono text-xs font-semibold tracking-wider text-muted-foreground text-right">TIMESTAMP</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-primary font-mono animate-pulse">
                    READING VCON ARCHIVE...
                  </TableCell>
                </TableRow>
              ) : vcons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground font-mono">
                    NO VCONS DETECTED IN ARCHIVE
                  </TableCell>
                </TableRow>
              ) : (
                vcons.map((vcon) => (
                  <TableRow
                    key={vcon.id}
                    className={`border-border hover:bg-secondary/20 transition-colors group ${isFetching ? "opacity-60" : ""}`}
                  >
                    <TableCell className="font-mono text-xs">
                      <Link href={`/vcons/${vcon.id}`} className="flex items-center gap-2 text-primary hover:underline">
                        <FileJson className="h-3 w-3 shrink-0" />
                        {vcon.uuid.split('-')[0]}...
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Link href={`/devices/${vcon.deviceId}`} className="hover:text-primary transition-colors">
                        {vcon.deviceName || "Unknown"}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{vcon.partyCount}</TableCell>
                    <TableCell className="font-mono text-sm">{vcon.duration ? `${Math.round(vcon.duration)}s` : '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-48">
                        {vcon.hasAnalysis && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 rounded-sm px-1.5 py-0 text-xs">
                            <BrainCircuit className="w-3 h-3 mr-1" />AI
                          </Badge>
                        )}
                        {vcon.hasAttachments && (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 rounded-sm px-1.5 py-0 text-xs">
                            <Paperclip className="w-3 h-3 mr-1" />Files
                          </Badge>
                        )}
                        {vcon.tags?.map((tag: string) => (
                          <Badge key={tag} variant="outline" className={`rounded-sm px-1.5 py-0 text-xs ${tagColor(tag)}`}>
                            <Tag className="w-2.5 h-2.5 mr-1" />{tag}
                          </Badge>
                        ))}
                        {!vcon.hasAnalysis && !vcon.hasAttachments && (!vcon.tags || vcon.tags.length === 0) && (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-sm px-1.5 py-0 text-xs font-mono
                        ${vcon.repostStatus === 'sent'    ? 'bg-green-500/10  text-green-400  border-green-500/20'  :
                          vcon.repostStatus === 'failed'  ? 'bg-red-500/10    text-red-400    border-red-500/20'    :
                          vcon.repostStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                            'bg-gray-500/10   text-gray-400   border-gray-500/20'}
                      `}>
                        {vcon.repostStatus.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {new Date(vcon.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Download vCon JSON"
                        onClick={() => downloadVcon(vcon.id, vcon.uuid)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-mono">
            Showing {startItem}–{endItem} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isFetching}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground font-mono px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || isFetching}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
