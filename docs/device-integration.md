# vConic Edge Device Integration Guide

This document defines the rules an edge vCon recording device must follow to successfully deliver vCons to the vConic portal.

---

## Gateway Endpoint

All devices push vCons to a single shared HTTP endpoint:

```
POST https://vcon-gateway.replit.app/ingress
Content-Type: application/json
```

The gateway determines which account owns the vCon using one of two routing methods (in priority order):

1. **Token parameter** — a device-specific token passed as a query string
2. **MAC address** — the device's MAC address embedded inside the vCon payload

---

## Method 1 — Token-Based Routing (Recommended)

Append your device token to the gateway URL as a query parameter:

```
POST https://vcon-gateway.replit.app/ingress?token=dvt_<your_device_token>
```

- The token is generated when you register a device in the portal
- It can be found on the device detail page under **Gateway URL (recommended)**
- If the token matches a registered device, the vCon is immediately routed to that account

**Example:**
```
POST https://vcon-gateway.replit.app/ingress?token=dvt_a3f92b1c84e7d06f5c2a1b9e43d8f0c7
```

---

## Method 2 — MAC Address Routing (Fallback)

If no token is provided (or the token is not recognized), the gateway reads the device's MAC address from inside the vCon payload and matches it against registered devices.

The MAC address must be present in **one** of these locations (checked in order):

| Priority | Field path | Example value |
|----------|-----------|---------------|
| 1 | `parties[0].meta.device_id` | `"84:1F:E8:83:29:24"` |
| 2 | `parties[0].meta.mac_address` | `"84:1F:E8:83:29:24"` |
| 3 | `parties[0].meta.deviceId` | `"841FE8832924"` |
| 4 | `meta.device_id` | `"84:1F:E8:83:29:24"` |
| 5 | `meta.mac_address` | `"84:1F:E8:83:29:24"` |
| 6 | `device_id` (top-level) | `"84:1F:E8:83:29:24"` |

The MAC address registered in the portal must match exactly (format and case).

---

## vCon Payload Format

The gateway accepts a standard vCon JSON object. The following fields are required or recommended:

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | string (UUID) | Unique identifier for this vCon — must be unique per recording |
| `created_at` | string (ISO 8601) | Timestamp when the vCon was created, e.g. `"2026-03-31T14:22:00Z"` |

### Recommended Fields

| Field | Type | Description |
|-------|------|-------------|
| `vcon` | string | vCon spec version, e.g. `"0.4.0"` (defaults to `"0.4.0"` if omitted) |
| `subject` | string | Short description of the recording |
| `parties` | array | List of participants — include device meta here for MAC routing |
| `dialog` | array | Audio/video dialog segments, each with optional `duration` (seconds) |
| `analysis` | array | Analysis results (transcript, sentiment, etc.) |
| `attachments` | array | Binary or encoded file attachments |

### Example Minimal Payload (token routing)

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "vcon": "0.4.0",
  "created_at": "2026-03-31T14:22:00Z",
  "subject": "Field recording #42",
  "parties": [],
  "dialog": [],
  "analysis": [],
  "attachments": []
}
```

### Example Full Payload (MAC address routing, no token)

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440001",
  "vcon": "0.4.0",
  "created_at": "2026-03-31T14:22:00Z",
  "subject": "Field recording #43",
  "parties": [
    {
      "name": "M5Stack Recorder",
      "role": "recorder",
      "meta": {
        "device_id": "84:1F:E8:83:29:24"
      }
    }
  ],
  "dialog": [
    {
      "type": "recording",
      "start": "2026-03-31T14:22:00Z",
      "duration": 180,
      "parties": [0],
      "mimetype": "audio/wav",
      "encoding": "base64url",
      "body": "<base64-encoded audio>"
    }
  ],
  "analysis": [],
  "attachments": []
}
```

---

## HTTP Response Codes

| Status | Meaning | Action |
|--------|---------|--------|
| `202 Accepted` | vCon routed to a known device account | Success — no retry needed |
| `200 OK` | vCon accepted but stored as **unassigned** | No retry needed — an admin must claim it in the portal |
| `400 Bad Request` | Payload is not valid JSON or missing required fields | Fix the payload before retrying |
| `5xx` | Server error | Retry with exponential backoff |

### 202 Response body (routed)

```json
{
  "status": "routed",
  "id": "<vcon-id>",
  "uuid": "<vcon-uuid>",
  "deviceId": "<device-id>",
  "message": "vCon routed to device \"Recorder #1\""
}
```

### 200 Response body (unassigned)

```json
{
  "status": "unassigned",
  "deviceIdentifier": "84:1F:E8:83:29:24",
  "message": "vCon accepted but no matching device found. Stored for manual assignment."
}
```

---

## Unassigned vCons

If a vCon lands as **unassigned** (status `200`), it is held in a queue visible to portal administrators at:

```
Portal → Unassigned Devices
```

From there, an admin can:
- **Assign to an existing device** — links the device identifier to an existing account and migrates all queued vCons
- **Create a new account** — provisions a new user account and device, then migrates all queued vCons

Once assigned, all future vCons from the same MAC address are automatically routed without admin intervention.

---

## Retry Policy

The device should implement the following retry logic:

1. On `202` or `200` → success, do not retry
2. On `400` → permanent failure, do not retry (log the error)
3. On network error or `5xx` → retry up to **3 times** with exponential backoff:
   - Attempt 1: wait 5 seconds
   - Attempt 2: wait 30 seconds
   - Attempt 3: wait 5 minutes
4. After 3 failures → store the vCon locally and retry on next boot/reconnect

---

## Request Headers

| Header | Required | Value |
|--------|----------|-------|
| `Content-Type` | Yes | `application/json` |
| `X-Device-Token` | Optional | Alternative to the `?token=` query param |

The token may be passed either as a query parameter (`?token=dvt_xxx`) or as the `X-Device-Token` header — both are equivalent.

---

## Quick Reference

```
# With token (recommended)
POST https://vcon-gateway.replit.app/ingress?token=dvt_<token>
Content-Type: application/json

# With MAC address only (no token)
POST https://vcon-gateway.replit.app/ingress
Content-Type: application/json
Body: vCon with parties[0].meta.device_id = "<MAC>"

# With token as header
POST https://vcon-gateway.replit.app/ingress
Content-Type: application/json
X-Device-Token: dvt_<token>
```
