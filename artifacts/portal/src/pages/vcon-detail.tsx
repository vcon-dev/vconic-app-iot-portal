import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useGetVcon } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, MessageSquare, BrainCircuit, Paperclip, Code, Clock, Play, Pause, ExternalLink } from "lucide-react";

function AudioPlayer({ src, mediatype }: { src: string; mediatype?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setError(true));
      setPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || isNaN(a.duration)) return;
    setCurrentTime(a.currentTime);
    setProgress((a.currentTime / a.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || isNaN(a.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div className="text-xs text-destructive font-mono mt-2">
        Unable to load audio — format may be unsupported by this browser.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-black/60 rounded-lg p-3 border border-border mt-2">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setError(true)}
        preload="metadata"
      />
      <button
        onClick={toggle}
        className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0 hover:bg-primary/80 transition-colors focus:outline-none"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing
          ? <Pause className="h-4 w-4 text-black" />
          : <Play className="h-4 w-4 text-black ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div
          className="h-1.5 bg-secondary rounded-full cursor-pointer overflow-hidden"
          onClick={handleSeek}
          title="Seek"
        >
          <div
            className="h-full bg-primary rounded-full transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono text-muted-foreground">
          <span>{fmt(currentTime)}</span>
          <span>{duration > 0 ? fmt(duration) : "--:--"}</span>
        </div>
      </div>
      {mediatype && (
        <span className="text-xs font-mono text-muted-foreground/60 shrink-0 hidden sm:block">
          {mediatype.replace("audio/", "")}
        </span>
      )}
    </div>
  );
}

export default function VconDetail({ params }: { params: { vconId: string } }) {
  const [, setLocation] = useLocation();
  const { data: vcon, isLoading } = useGetVcon(params.vconId);
  const [showRaw, setShowRaw] = useState(false);

  if (isLoading) {
    return <div className="text-primary font-mono animate-pulse">DECRYPTING VCON PAYLOAD...</div>;
  }

  if (!vcon) return <div>vCon not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/vcons")} className="rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono break-all">{vcon.uuid}</h1>
            <Badge variant="outline" className={`rounded-sm font-mono
                ${vcon.repostStatus === 'sent' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  vcon.repostStatus === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  vcon.repostStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  'bg-gray-500/10 text-gray-400 border-gray-500/20'}
              `}>
              ROUTING: {vcon.repostStatus.toUpperCase()} {vcon.repostAttempts > 0 && `(${vcon.repostAttempts})`}
            </Badge>
          </div>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground font-mono">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(vcon.createdAt).toLocaleString()}</span>
            <span>SOURCE: {vcon.deviceName || vcon.deviceId}</span>
            <span>V: {vcon.vconVersion || '0.0.1'}</span>
          </div>
        </div>
      </div>

      {vcon.subject && (
        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase mb-1">Subject</h3>
            <p className="text-lg">{vcon.subject}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parties */}
        <Card className="bg-card border-border/50 flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Parties ({vcon.parties?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {vcon.parties?.map((party, idx) => (
              <div key={idx} className="p-4 border-b border-border/30 last:border-0 hover:bg-secondary/20">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold">{party.name || `Party ${idx}`}</div>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      {party.tel && <div><span className="text-xs font-mono uppercase mr-2">TEL</span>{party.tel}</div>}
                      {party.mailto && <div><span className="text-xs font-mono uppercase mr-2">MAIL</span>{party.mailto}</div>}
                    </div>
                  </div>
                  {party.role && <Badge variant="secondary" className="font-mono text-xs">{party.role}</Badge>}
                </div>
              </div>
            ))}
            {(!vcon.parties || vcon.parties.length === 0) && (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">NO PARTIES DEFINED</div>
            )}
          </CardContent>
        </Card>

        {/* Dialog */}
        <Card className="bg-card border-border/50 flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Dialog ({vcon.dialog?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {vcon.dialog?.map((dlg, idx) => {
              const toStdBase64 = (s: string) =>
                s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');

              const audioSrc = dlg.type === 'recording'
                ? dlg.url || (dlg.body ? `data:${dlg.mediatype || 'audio/wav'};base64,${toStdBase64(dlg.body)}` : null)
                : null;

              return (
                <div key={idx} className="p-4 border-b border-border/30 last:border-0">
                  <div className="flex justify-between mb-2">
                    <Badge variant="outline" className="font-mono border-primary/30 text-primary">{dlg.type.toUpperCase()}</Badge>
                    {dlg.duration != null && (
                      <span className="text-xs font-mono text-muted-foreground">{dlg.duration}s</span>
                    )}
                  </div>

                  {dlg.start && (
                    <div className="text-xs text-muted-foreground mb-2">{new Date(dlg.start).toLocaleString()}</div>
                  )}

                  {dlg.type === 'text' && dlg.body && (
                    <div className="bg-black/50 p-3 rounded border border-border text-sm break-words whitespace-pre-wrap">
                      {dlg.body}
                    </div>
                  )}

                  {dlg.type === 'recording' && (
                    <div className="space-y-2">
                      {audioSrc ? (
                        <AudioPlayer src={audioSrc} mediatype={dlg.mediatype} />
                      ) : (
                        <div className="text-xs text-muted-foreground italic">No audio source available</div>
                      )}
                      {dlg.url && (
                        <a
                          href={dlg.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline font-mono"
                        >
                          <ExternalLink className="h-3 w-3" /> Open source URL
                        </a>
                      )}
                      {!dlg.url && dlg.body && (
                        <div className="text-xs text-muted-foreground font-mono">
                          Inline {dlg.encoding || 'base64'} — {Math.round((dlg.body.length * 0.75) / 1024)} KB
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-muted-foreground">
                    Parties: {dlg.parties?.join(', ') || 'all'}
                  </div>
                </div>
              );
            })}
            {(!vcon.dialog || vcon.dialog.length === 0) && (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">NO DIALOG SEGMENTS</div>
            )}
          </CardContent>
        </Card>

        {/* Analysis */}
        <Card className="bg-card border-border/50 flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-blue-400" />
              Analysis ({vcon.analysis?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-96">
            {vcon.analysis?.map((an, idx) => (
              <div key={idx} className="p-4 border-b border-border/30 last:border-0 hover:bg-secondary/20">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">{an.type}</Badge>
                  <Badge variant="outline" className="text-muted-foreground">{an.vendor}</Badge>
                </div>
                {an.body && (
                  <div className="mt-2">
                    <details className="group">
                      <summary className="text-xs text-primary cursor-pointer hover:underline font-mono">VIEW PAYLOAD</summary>
                      <pre className="mt-2 text-xs bg-black/80 p-3 rounded overflow-x-auto border border-border text-gray-300 whitespace-pre-wrap">
                        {typeof an.body === 'string' && an.body.startsWith('{') ? JSON.stringify(JSON.parse(an.body), null, 2) : an.body}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
            {(!vcon.analysis || vcon.analysis.length === 0) && (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">NO ANALYSIS MODULES</div>
            )}
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card className="bg-card border-border/50 flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-purple-400" />
              Attachments ({vcon.attachments?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-96">
            {vcon.attachments?.map((att, idx) => (
              <div key={idx} className="p-4 border-b border-border/30 last:border-0 hover:bg-secondary/20">
                <Badge variant="secondary" className="mb-2 font-mono">{att.purpose}</Badge>
                <div className="text-xs text-muted-foreground space-y-1">
                  {att.mediatype && <div>Type: {att.mediatype}</div>}
                  {att.party !== undefined && <div>Ref Party: {att.party}</div>}
                  {att.dialog !== undefined && <div>Ref Dialog: {att.dialog}</div>}
                </div>
              </div>
            ))}
            {(!vcon.attachments || vcon.attachments.length === 0) && (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">NO ATTACHMENTS</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="cursor-pointer hover:bg-secondary/10 transition-colors" onClick={() => setShowRaw(!showRaw)}>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-muted-foreground" />
              Raw vCon Source
            </div>
            <Button variant="ghost" size="sm" className="font-mono text-xs">
              {showRaw ? "HIDE" : "EXPAND"}
            </Button>
          </CardTitle>
        </CardHeader>
        {showRaw && (
          <CardContent className="border-t border-border/50 pt-4">
            <pre className="bg-[#0a0a0a] p-4 rounded-md overflow-x-auto text-xs font-mono text-[#a5d6ff] border border-border">
              {JSON.stringify(JSON.parse(vcon.rawJson), null, 2)}
            </pre>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
