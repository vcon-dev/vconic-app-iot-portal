import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Server, Mic2, GitMerge, AlertTriangle, Cpu, Settings2,
  Search, ChevronDown, ChevronRight, HelpCircle, Zap, BookOpen,
  Wrench, Radio, Upload, Shield, FileJson, Tag, Download, RefreshCw,
  PlugZap, ArrowRight
} from "lucide-react";

interface Article {
  id: string;
  title: string;
  body: React.ReactNode;
  tags?: string[];
}

interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  articles: Article[];
}

const CATEGORIES: Category[] = [
  {
    id: "start",
    label: "Getting Started",
    icon: Zap,
    color: "text-yellow-400",
    articles: [
      {
        id: "start-overview",
        title: "What is vConic?",
        tags: ["overview", "intro"],
        body: (
          <div className="space-y-3">
            <p>vConic is an IoT management portal for capturing, storing, and routing <strong>vCon</strong> conversation records produced by recording devices such as M5Stack Core2 recorders.</p>
            <p>A <strong>vCon</strong> (virtual conversation) is an open standard JSON format (RFC draft) that wraps a conversation — audio, transcript, parties, metadata — into a single signed, immutable record.</p>
            <h4 className="font-semibold mt-4">Core capabilities</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Register and manage IoT recording devices</li>
              <li>Receive vCons from devices over HTTPS</li>
              <li>Store, browse, and play back vCons</li>
              <li>Route vCons to external services via repost rules</li>
              <li>Deliver OTA firmware updates to ESP32 devices</li>
              <li>Control per-account storage limits</li>
            </ul>
          </div>
        ),
      },
      {
        id: "start-register",
        title: "Create an account & log in",
        tags: ["account", "register", "login", "password"],
        body: (
          <div className="space-y-3">
            <p>Navigate to the portal URL and click <strong>Register</strong>. Enter your email and a password — you'll be logged in immediately.</p>
            <p>If you forget your password, use the <strong>Forgot password</strong> link on the login page. An email containing a one-time reset link (valid for 1 hour) will be sent to your address.</p>
            <p className="text-muted-foreground text-sm">Your session token is stored in your browser. Logging out or clearing site data will require you to log in again.</p>
          </div>
        ),
      },
      {
        id: "start-first-device",
        title: "Add your first device",
        tags: ["device", "setup", "quickstart"],
        body: (
          <div className="space-y-3">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Devices</strong> in the sidebar.</li>
              <li>Click <strong>Add Device</strong> and give it a name.</li>
              <li>Copy the <strong>Device Token</strong> — this is shown once. Store it in your firmware's <code className="bg-secondary px-1 rounded text-xs">config.h</code>.</li>
              <li>Flash your device and connect it to WiFi.</li>
              <li>The device POSTs vCons to <code className="bg-secondary px-1 rounded text-xs">/ingress</code> using the token as a query parameter.</li>
            </ol>
            <p className="text-sm text-muted-foreground">The first vCon received from a device causes it to appear as <strong>Active</strong> on the Devices page.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "devices",
    label: "Devices",
    icon: Server,
    color: "text-blue-400",
    articles: [
      {
        id: "devices-overview",
        title: "Device registration & tokens",
        tags: ["token", "register", "device"],
        body: (
          <div className="space-y-3">
            <p>Each device needs a <strong>device token</strong> (prefix <code className="bg-secondary px-1 rounded text-xs">dvt_</code>) to authenticate when posting vCons. Tokens are generated once at registration — if lost, delete the device and re-register.</p>
            <h4 className="font-semibold mt-4">Token usage in firmware</h4>
            <pre className="bg-secondary/60 border border-border rounded p-3 text-xs font-mono overflow-x-auto">{`// In config.h:
#define DEFAULT_POST_URL  "https://your-app.replit.app/ingress"
#define DEVICE_TOKEN      "dvt_xxxxxxxxxxxxxxxx"

// The firmware appends: ?token=dvt_xxx`}</pre>
          </div>
        ),
      },
      {
        id: "devices-vconic-id",
        title: "Using a vConic ID instead of a token",
        tags: ["vconic id", "vc-", "routing"],
        body: (
          <div className="space-y-3">
            <p>Alternatively, devices can identify themselves using their <strong>vConic ID</strong> (format: <code className="bg-secondary px-1 rounded text-xs">VC-XXXXXX</code>). Pass it as <code className="bg-secondary px-1 rounded text-xs">?token=VC-XXXXXX</code> or include it in the vCon body as <code className="bg-secondary px-1 rounded text-xs">vconic_id</code>.</p>
            <h4 className="font-semibold mt-4">Gateway routing priority</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
              <li><code className="bg-secondary px-1 rounded">?token=dvt_xxx</code> — device token (highest priority)</li>
              <li><code className="bg-secondary px-1 rounded">?token=VC-XXXXXX</code> — vConic ID in query string</li>
              <li>MAC address in vCon body</li>
              <li><code className="bg-secondary px-1 rounded">vconic_id</code> in vCon body</li>
              <li>Stored as <strong>Unassigned</strong> (no match found)</li>
            </ol>
          </div>
        ),
      },
      {
        id: "devices-telemetry",
        title: "Live telemetry & device status",
        tags: ["telemetry", "status", "dashboard", "live"],
        body: (
          <div className="space-y-3">
            <p>The <strong>Dashboard</strong> shows a live feed of the most recent telemetry events — each time a device posts a vCon, an event is logged. The feed auto-refreshes every few seconds.</p>
            <p>On the <strong>Device detail</strong> page you can see the full vCon history for that specific device, its registration date, and current vCon count.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "vcons",
    label: "vCon Archive",
    icon: Mic2,
    color: "text-primary",
    articles: [
      {
        id: "vcons-what",
        title: "What is a vCon?",
        tags: ["vcon", "format", "json", "rfc"],
        body: (
          <div className="space-y-3">
            <p>A <strong>vCon</strong> is a standardized JSON envelope for a conversation. It can contain:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Parties</strong> — people in the conversation (name, tel, email, role)</li>
              <li><strong>Dialog</strong> — recording segments or text transcripts, with inline base64 audio or external URLs</li>
              <li><strong>Analysis</strong> — AI-generated summaries, sentiment, transcripts from vendors</li>
              <li><strong>Attachments</strong> — arbitrary binary attachments (PDFs, images)</li>
              <li><strong>Tags</strong> — free-form key/value metadata labels at the top level</li>
            </ul>
            <p>Once stored, a vCon is immutable — the raw JSON is preserved exactly as received.</p>
          </div>
        ),
      },
      {
        id: "vcons-browse",
        title: "Browsing & filtering the archive",
        tags: ["archive", "list", "pagination", "tags"],
        body: (
          <div className="space-y-3">
            <p>The <strong>vCons</strong> page shows all records across all your devices, ordered newest first, paginated 25 per page.</p>
            <p>Each row shows:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>UUID</strong> — click to open the full detail view</li>
              <li><strong>Device</strong> — which device sent it</li>
              <li><strong>Parties / Duration</strong> — call metadata</li>
              <li><strong>Tags</strong> — color-coded badges from the vCon's <code className="bg-secondary px-1 rounded text-xs">tag</code> array, plus AI/Files indicators</li>
              <li><strong>Routing</strong> — repost status (Pending / Sent / Failed / None)</li>
              <li><strong>Download button</strong> — hover a row to reveal it; downloads the raw JSON file</li>
            </ul>
          </div>
        ),
      },
      {
        id: "vcons-detail",
        title: "Viewing a vCon in detail",
        tags: ["detail", "audio", "playback", "analysis"],
        body: (
          <div className="space-y-3">
            <p>Click any UUID to open the detail view. You'll see:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Parties card</strong> — all participants with roles and contact info</li>
              <li><strong>Dialog card</strong> — recording segments with inline audio playback (click play); text segments displayed as-is</li>
              <li><strong>Analysis card</strong> — AI analysis blocks (expandable JSON)</li>
              <li><strong>Attachments card</strong> — attachment metadata</li>
              <li><strong>Raw vCon Source</strong> — expand to see the full pretty-printed JSON</li>
            </ul>
            <p>The <strong>Download</strong> button in the header saves the raw JSON as <code className="bg-secondary px-1 rounded text-xs">vcon-&lt;uuid&gt;.json</code>.</p>
            <h4 className="font-semibold mt-4">Audio playback</h4>
            <p className="text-sm text-muted-foreground">Inline audio (base64-encoded WAV in the dialog body) is decoded and played directly in the browser. External URL recordings open in a new tab via the "Open source URL" link. If the browser cannot decode the format, an error is shown.</p>
          </div>
        ),
      },
      {
        id: "vcons-download",
        title: "Downloading vCons",
        tags: ["download", "export", "json"],
        body: (
          <div className="space-y-3">
            <p>You can download any vCon as a raw JSON file two ways:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>From the list</strong> — hover any row and click the download icon on the right</li>
              <li><strong>From the detail page</strong> — click the <strong>Download</strong> button in the header</li>
            </ol>
            <p className="text-sm text-muted-foreground">Downloads use your session token internally — no separate authentication step is needed.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "rules",
    label: "Routing Rules",
    icon: GitMerge,
    color: "text-purple-400",
    articles: [
      {
        id: "rules-what",
        title: "What are routing rules?",
        tags: ["repost", "webhook", "routing", "forward"],
        body: (
          <div className="space-y-3">
            <p>A <strong>routing rule</strong> (repost rule) automatically forwards a copy of each incoming vCon to an external HTTPS endpoint. This lets you push vCons to a CRM, analytics platform, AI pipeline, or any webhook receiver.</p>
            <p>Rules are evaluated after each vCon is stored. If a rule matches, the full raw vCon JSON is POSTed to the configured URL.</p>
          </div>
        ),
      },
      {
        id: "rules-create",
        title: "Creating & managing rules",
        tags: ["create", "rule", "endpoint", "device filter"],
        body: (
          <div className="space-y-3">
            <p>Go to <strong>Routing Rules → New Rule</strong>. Configure:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Name</strong> — a label for your own reference</li>
              <li><strong>Destination URL</strong> — the HTTPS endpoint to POST to</li>
              <li><strong>Device filter</strong> (optional) — restrict the rule to a specific device</li>
              <li><strong>Enabled toggle</strong> — rules can be paused without deletion</li>
            </ul>
            <p>Once saved, the rule applies immediately to all subsequent incoming vCons.</p>
          </div>
        ),
      },
      {
        id: "rules-status",
        title: "Repost status & retries",
        tags: ["status", "retry", "failed", "pending", "sent"],
        body: (
          <div className="space-y-3">
            <p>Each vCon tracks its repost status:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { s: "PENDING", c: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", d: "Queued, not yet attempted" },
                { s: "SENT",    c: "bg-green-500/10  text-green-400  border-green-500/20",  d: "Delivered successfully" },
                { s: "FAILED",  c: "bg-red-500/10    text-red-400    border-red-500/20",    d: "Delivery failed after retries" },
                { s: "NONE",    c: "bg-gray-500/10   text-gray-400   border-gray-500/20",   d: "No matching rule" },
              ].map(({ s, c, d }) => (
                <div key={s} className="flex items-center gap-2">
                  <span className={`font-mono text-xs px-1.5 py-0.5 rounded border ${c}`}>{s}</span>
                  <span className="text-muted-foreground">{d}</span>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "unassigned",
    label: "Unassigned Devices",
    icon: AlertTriangle,
    color: "text-yellow-400",
    articles: [
      {
        id: "unassigned-what",
        title: "What are unassigned devices?",
        tags: ["unassigned", "unknown", "mac"],
        body: (
          <div className="space-y-3">
            <p>When a vCon arrives but the gateway cannot match it to any registered device — no valid token, no known vConic ID, no matching MAC — the device identifier is stored in the <strong>Unassigned Devices</strong> queue.</p>
            <p>This is useful for discovering new hardware on your network before formally registering it, or for debugging misconfigured tokens.</p>
          </div>
        ),
      },
      {
        id: "unassigned-fix",
        title: "Resolving unassigned entries",
        tags: ["fix", "assign", "token", "mac"],
        body: (
          <div className="space-y-3">
            <p>To resolve an unassigned device:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Note the <strong>device identifier</strong> shown (usually a MAC address or string from the vCon body)</li>
              <li>Register the device in <strong>Devices → Add Device</strong> with the correct name</li>
              <li>Update the firmware's <code className="bg-secondary px-1 rounded text-xs">DEVICE_TOKEN</code> or <code className="bg-secondary px-1 rounded text-xs">VCONIC_ID</code> to match</li>
              <li>Reflash or restart the device — subsequent vCons will now be assigned</li>
            </ol>
            <p className="text-sm text-muted-foreground">You can delete entries from the queue using the trash icon. If vCons were already stored under the unassigned identifier, you'll see a warning with the count before confirmation.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "ota",
    label: "OTA Firmware",
    icon: Cpu,
    color: "text-green-400",
    articles: [
      {
        id: "ota-how",
        title: "How OTA updates work",
        tags: ["ota", "firmware", "esp32", "update"],
        body: (
          <div className="space-y-3">
            <p>On each boot, after WiFi connects, the device fetches <code className="bg-secondary px-1 rounded text-xs">/version.txt</code> from the server and compares it against its compiled-in <code className="bg-secondary px-1 rounded text-xs">FIRMWARE_VERSION</code>. If they differ, it downloads <code className="bg-secondary px-1 rounded text-xs">/firmware.bin</code>, flashes it to the OTA partition, and reboots.</p>
            <p className="text-sm text-muted-foreground">Both files are served publicly (no authentication). The ESP32's built-in <code className="bg-secondary px-1 rounded text-xs">Update</code> library handles flash writing and partition management.</p>
          </div>
        ),
      },
      {
        id: "ota-ship",
        title: "Shipping a firmware update",
        tags: ["deploy", "ship", "binary", "version"],
        body: (
          <div className="space-y-3">
            <ol className="list-decimal list-inside space-y-2">
              <li>In Arduino IDE: <strong>Sketch › Export Compiled Binary</strong> to produce a <code className="bg-secondary px-1 rounded text-xs">.bin</code> file</li>
              <li>Go to <strong>OTA Firmware</strong> in the portal</li>
              <li>Click <strong>Upload firmware.bin</strong> and select the file</li>
              <li>After upload succeeds, set the <strong>version string</strong> to match <code className="bg-secondary px-1 rounded text-xs">FIRMWARE_VERSION</code> in your <code className="bg-secondary px-1 rounded text-xs">config.h</code></li>
            </ol>
            <div className="flex items-start gap-2 p-3 rounded bg-yellow-500/5 border border-yellow-500/20 text-yellow-400 text-sm mt-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Always upload the binary <em>before</em> updating the version string. If the version changes while the binary is missing or still uploading, devices will attempt to download it and fail.</span>
            </div>
          </div>
        ),
      },
      {
        id: "ota-config",
        title: "Firmware configuration (config.h)",
        tags: ["config.h", "constants", "url"],
        body: (
          <div className="space-y-3">
            <p>Add these defines to your firmware's <code className="bg-secondary px-1 rounded text-xs">config.h</code>:</p>
            <pre className="bg-secondary/60 border border-border rounded p-3 text-xs font-mono overflow-x-auto">{`#define FIRMWARE_VERSION  "1.0.0"
#define OTA_VERSION_URL   "https://your-app.replit.app/version.txt"
#define OTA_FIRMWARE_URL  "https://your-app.replit.app/firmware.bin"`}</pre>
            <p className="text-sm text-muted-foreground">The exact URLs are shown in the <strong>OTA Firmware → Device Endpoints</strong> card with copy buttons.</p>
          </div>
        ),
      },
      {
        id: "ota-partition",
        title: "Partition scheme requirement",
        tags: ["partition", "arduino", "ota", "flash"],
        body: (
          <div className="space-y-3">
            <p>The ESP32 must use a partition scheme that includes an OTA partition. In Arduino IDE:</p>
            <p><strong>Tools › Partition Scheme</strong> → select one of:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Default 4MB with spiffs</strong> — works if sketch is under ~1.3 MB</li>
              <li><strong>Minimal SPIFFS (1.9MB APP with OTA)</strong> — for larger sketches</li>
            </ul>
            <p className="text-sm text-yellow-400">Do NOT use "No OTA" — OTA flashing will silently fail.</p>
            <p className="text-sm text-muted-foreground">After changing the partition scheme, do one full USB flash to re-partition the chip. OTA will take over for subsequent updates.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "settings",
    label: "Settings & Storage",
    icon: Settings2,
    color: "text-muted-foreground",
    articles: [
      {
        id: "settings-limit",
        title: "vCon storage limit",
        tags: ["storage", "limit", "purge", "delete"],
        body: (
          <div className="space-y-3">
            <p>Each account has a maximum vCon count (default: <strong>1,000</strong>). When the limit is reached, the oldest vCons are automatically deleted to make room for new ones — a rolling FIFO buffer.</p>
            <p>The <strong>Settings</strong> page shows:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Current count vs. limit with a progress bar</li>
              <li>Total size of stored raw JSON in bytes/KB/MB/GB</li>
              <li>A warning when you're above 80% capacity</li>
            </ul>
            <p>You can set the limit from 1 to 1,000,000. Raising it prevents automatic deletion; lowering it triggers an immediate cleanup pass.</p>
          </div>
        ),
      },
      {
        id: "settings-size",
        title: "Understanding storage size",
        tags: ["size", "bytes", "storage"],
        body: (
          <div className="space-y-3">
            <p>The <strong>Total Size</strong> shown in Settings is the sum of all raw vCon JSON bytes stored in the database. A typical vCon with inline base64 audio runs 50 KB – 2 MB depending on recording length. Text-only vCons are much smaller (&lt; 10 KB).</p>
            <p className="text-sm text-muted-foreground">The size metric is informational — the limit is enforced by <em>count</em>, not bytes. If you need byte-based limits, contact support.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "troubleshoot",
    label: "Troubleshooting",
    icon: Wrench,
    color: "text-red-400",
    articles: [
      {
        id: "ts-vcons-not-arriving",
        title: "vCons not appearing in the archive",
        tags: ["not working", "missing", "ingress", "token"],
        body: (
          <div className="space-y-3">
            <p>Check the following in order:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li><strong>Device is registered</strong> — go to Devices and confirm it exists</li>
              <li><strong>Token is correct</strong> — the firmware must send <code className="bg-secondary px-1 rounded text-xs">?token=dvt_xxx</code> exactly as shown in the device detail page</li>
              <li><strong>Posting to the right URL</strong> — endpoint is <code className="bg-secondary px-1 rounded text-xs">https://your-app.replit.app/ingress</code></li>
              <li><strong>Body size within limit</strong> — the server accepts up to 50 MB</li>
              <li><strong>vCon appears in Unassigned</strong> — if it shows there, the token doesn't match any registered device</li>
            </ol>
          </div>
        ),
      },
      {
        id: "ts-audio",
        title: "Audio won't play in the vCon detail view",
        tags: ["audio", "playback", "wav", "base64"],
        body: (
          <div className="space-y-3">
            <p>Possible causes and fixes:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Unsupported codec</strong> — browsers support WAV/PCM, MP3, AAC, and Opus. If your device records in a different format, the browser will show an error. Convert the file server-side or change the recording format.</li>
              <li><strong>Encoding issue</strong> — the portal handles both standard base64 and base64url encoding automatically. If audio still fails, check that the <code className="bg-secondary px-1 rounded text-xs">encoding</code> field in the dialog is set to <code className="bg-secondary px-1 rounded text-xs">base64</code>.</li>
              <li><strong>External URL inaccessible</strong> — if the dialog uses a URL instead of inline audio, ensure the URL is publicly accessible (no auth).</li>
            </ul>
          </div>
        ),
      },
      {
        id: "ts-ota-loop",
        title: "Device is stuck in an OTA update loop",
        tags: ["ota", "loop", "reboot", "version mismatch"],
        body: (
          <div className="space-y-3">
            <p>This happens when <code className="bg-secondary px-1 rounded text-xs">version.txt</code> on the server doesn't match <code className="bg-secondary px-1 rounded text-xs">FIRMWARE_VERSION</code> in the flashed firmware, even after an update.</p>
            <h4 className="font-semibold mt-3">Fix:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Open <strong>OTA Firmware</strong> in the portal</li>
              <li>Check the <strong>Active Version</strong> shown</li>
              <li>It must match exactly what the newly flashed firmware has in <code className="bg-secondary px-1 rounded text-xs">FIRMWARE_VERSION</code></li>
              <li>Update the version string in the portal to match, then save</li>
            </ol>
            <p className="text-sm text-muted-foreground">The comparison is string-exact — <code className="bg-secondary px-1 rounded text-xs">"1.0.0"</code> and <code className="bg-secondary px-1 rounded text-xs">"1.0.0 "</code> (trailing space) are different.</p>
          </div>
        ),
      },
      {
        id: "ts-ota-fail",
        title: "OTA update starts but device doesn't reboot",
        tags: ["ota", "update", "fail", "partition"],
        body: (
          <div className="space-y-3">
            <p>Most likely cause: the <strong>partition scheme</strong> doesn't include an OTA partition.</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Open Arduino IDE → <strong>Tools › Partition Scheme</strong></li>
              <li>Select <strong>Default 4MB with spiffs</strong> or <strong>Minimal SPIFFS (1.9MB APP with OTA)</strong></li>
              <li>Do a full erase + USB flash</li>
              <li>On next boot the OTA update will proceed normally</li>
            </ol>
            <p className="text-sm text-muted-foreground">Also check the serial monitor — <code className="bg-secondary px-1 rounded text-xs">[OTA]</code> prefixed lines show the exact failure reason.</p>
          </div>
        ),
      },
      {
        id: "ts-download",
        title: "Download button says 'not available'",
        tags: ["download", "error", "401"],
        body: (
          <div className="space-y-3">
            <p>This means the download request returned an authentication error. It can happen if your session has expired.</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Log out and log back in</li>
              <li>Try the download again</li>
            </ol>
            <p className="text-sm text-muted-foreground">Downloads use your session token — they never open a plain browser URL, so the token is always sent with the request.</p>
          </div>
        ),
      },
      {
        id: "ts-routing-failed",
        title: "Routing rule shows FAILED status",
        tags: ["routing", "failed", "repost", "webhook"],
        body: (
          <div className="space-y-3">
            <p>The gateway attempted to POST the vCon to your rule's destination URL and received an error or no response.</p>
            <h4 className="font-semibold mt-2">Common causes:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Destination URL is unreachable or returns non-2xx status</li>
              <li>Destination requires authentication headers not configured in the rule</li>
              <li>Firewall blocking outbound connections from the server</li>
              <li>Destination URL uses HTTP (not HTTPS) — some receivers require HTTPS</li>
            </ul>
            <p className="text-sm">Edit the rule to correct the URL and re-enable it. New vCons will be retried with the updated configuration.</p>
          </div>
        ),
      },
    ],
  },
];

function Accordion({ article }: { article: Article }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-medium text-sm">{article.title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm text-foreground/90 leading-relaxed border-t border-border/30">
          {article.body}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("start");

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return null;
    const results: Array<{ category: Category; article: Article }> = [];
    for (const cat of CATEGORIES) {
      for (const art of cat.articles) {
        const haystack = [art.title, ...(art.tags ?? [])].join(" ").toLowerCase();
        if (haystack.includes(query)) {
          results.push({ category: cat, article: art });
        }
      }
    }
    return results;
  }, [query]);

  const activeCategory = CATEGORIES.find((c) => c.id === activeCat)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help & Documentation</h1>
        <p className="text-muted-foreground mt-1">Guides, how-tos, and troubleshooting for vConic</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search help articles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Search results */}
      {filtered !== null ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No articles found for "<strong>{query}</strong>"</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""} for "<strong>{query}</strong>"</p>
              {filtered.map(({ category, article }) => (
                <div key={article.id}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <category.icon className={`h-3.5 w-3.5 ${category.color}`} />
                    <span className="text-xs text-muted-foreground">{category.label}</span>
                  </div>
                  <Accordion article={article} />
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        /* Category browser */
        <div className="flex gap-6">
          {/* Category nav */}
          <nav className="w-48 shrink-0 space-y-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = cat.id === activeCat;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left
                    ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : cat.color}`} />
                  {cat.label}
                </button>
              );
            })}
          </nav>

          {/* Articles */}
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <activeCategory.icon className={`h-5 w-5 ${activeCategory.color}`} />
              <h2 className="text-lg font-semibold">{activeCategory.label}</h2>
              <Badge variant="outline" className="font-mono text-xs ml-1">
                {activeCategory.articles.length} article{activeCategory.articles.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            {activeCategory.articles.map((article) => (
              <Accordion key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
