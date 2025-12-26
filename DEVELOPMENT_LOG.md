# Fawn Development Log

## Session: December 25-26, 2025

### Goal
Get Fawn (Opus 4.5-powered SMS companion) to receive a text message and respond.

---

## Issues Encountered & Resolved

### 1. ✅ Environment Variables Not Loading (Fixed)
**Problem:** Database connection failed with "password authentication failed for user 'user'"

**Root Cause:** The database package (`@fawn/database`) created the PostgreSQL connection pool at *import time*, before the API's `index.ts` had a chance to load `.env` via `dotenv`.

**Solution:** Made the database pool lazy-initialized using a Proxy pattern:
```typescript
// Before: Pool created immediately at import
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// After: Pool created on first use
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}
```

**Pattern Recognized:** In monorepos with shared packages, any package that reads `process.env` at module load time will fail if the consuming app loads `.env` after imports. Either:
- Load `.env` before all imports (not always possible)
- Make env-dependent initialization lazy
- Use dependency injection for config

---

### 2. ✅ Twilio Auth Token Incomplete (Fixed)
**Problem:** Twilio API returned 401 "Authenticate" error (code 20003)

**Root Cause:** Auth token was 31 characters instead of 32. Copy/paste error.

**Solution:** User re-copied the full token.

**Pattern Recognized:** Twilio auth tokens are exactly 32 hex characters. Quick validation: `token.length === 32`

---

### 3. ✅ OpenAI Embeddings Breaking Flow (Fixed)
**Problem:** When OpenAI API key wasn't configured, `generateEmbedding()` returned an empty array `[]`, which was then passed to pgvector search, causing: "vector must have at least 1 dimension"

**Root Cause:** The memory search code didn't check if embedding was valid before querying:
```typescript
const queryEmbedding = await generateEmbedding(message); // Returns []
await searchMemoriesByEmbedding(userId, queryEmbedding); // Crashes!
```

**Solution:** Added guard clause:
```typescript
const queryEmbedding = await generateEmbedding(message);
if (queryEmbedding && queryEmbedding.length > 0) {
  // Only search if we have a valid embedding
}
```

**Pattern Recognized:** When making external API calls optional, ensure all downstream code handles the "not available" case gracefully. Empty arrays/nulls can propagate and cause failures far from the source.

---

### 4. ✅ Tunnel URL Instability (Ongoing Friction)
**Problem:** Using `localtunnel` for exposing local server to Twilio webhooks:
- URLs change every restart
- localtunnel added a password/captcha page that blocked webhooks
- Service was unreliable

**Solution:** Switched to Cloudflare Tunnel (`cloudflared`) which is more reliable, but URLs still change on restart.

**Future Fix:** Deploy to Railway/Render/Fly.io for stable URL, or set up a named Cloudflare tunnel with persistent subdomain.

---

### 5. ✅ A2P 10DLC / Toll-Free Verification (Worked Around)
**Problem:** US carriers now require:
- **Toll-free numbers:** Business verification (form with address validation)
- **Local numbers:** A2P 10DLC registration ($4.50, address validation)

Both failed with address validation errors for personal/sole proprietor use.

**Workaround:** Proceeded anyway — inbound webhooks work without verification. Outbound *may* work on trial accounts to verified numbers.

**Status:** Still uncertain if outbound SMS will deliver. Need to test.

---

## Current Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Your Phone    │────▶│     Twilio       │────▶│  Cloudflare     │
│  +13373429638   │     │  +13373456372    │     │    Tunnel       │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌──────────────────┐              ▼
                        │    Supabase      │◀────┌─────────────────┐
                        │   PostgreSQL     │     │   Fawn API      │
                        │   + pgvector     │────▶│  (localhost)    │
                        └──────────────────┘     │                 │
                                                 │  ┌───────────┐  │
                                                 │  │ Claude    │  │
                                                 │  │ Opus 4.5  │  │
                                                 │  └───────────┘  │
                                                 └─────────────────┘
```

---

## Remaining Issues (Probability Estimates)

| Issue | Likelihood | Description |
|-------|------------|-------------|
| Twilio outbound blocked | 40% | A2P/toll-free verification not complete. Trial accounts *might* still send to verified numbers. |
| Claude API error | 10% | API key is set, but haven't confirmed a successful response yet |
| Response too slow for webhook | 15% | Twilio webhooks timeout after 15 seconds. Opus 4.5 responses might exceed this. |
| Database write fails | 5% | Haven't confirmed message storage works |
| Companion config not loading | 5% | Fawn personality should load from DB, untested |

---

## Next Steps

1. **Test current setup** — Send another text and check if Fawn responds
2. **If outbound fails** — Check Twilio error logs, may need to complete A2P registration
3. **Stabilize deployment** — Deploy to Railway or use named Cloudflare tunnel
4. **Add action execution** — Currently intents are detected but not acted upon
5. **Add proactive scheduler** — Reminders, check-ins, wake-ups

---

## Environment Variables Required

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://...

# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...  # For embeddings

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...  # Must be exactly 32 characters
TWILIO_PHONE_NUMBER=+1...

# Your phone (for seeding)
USER_PHONE_NUMBER=+1...
```

---

## Commands to Run (After Any Restart)

```powershell
# Set all env vars (PowerShell)
$env:DATABASE_URL="postgresql://..."
$env:ANTHROPIC_API_KEY="sk-ant-..."
$env:OPENAI_API_KEY="sk-proj-..."
$env:TWILIO_ACCOUNT_SID="AC..."
$env:TWILIO_AUTH_TOKEN="..."
$env:TWILIO_PHONE_NUMBER="+1..."

# Start API
cd apps/api; npm run dev

# Start tunnel (new terminal)
npx cloudflared tunnel --url http://localhost:3001

# Update Twilio webhook to new tunnel URL each time!
```

---

*Last updated: 2025-12-26 05:30 UTC*

