# WhatsApp Infrastructure Setup Guide — Datun

## 1. Cloudflare DNS (REQUIRED — webhooks public access)

### 1.1 Verify Cloudflare nameservers

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Login
2. Select `datunai.com`
3. **Overview** tab → confirm "Active" status (green)
4. **DNS** tab → click "Records"

### 1.2 Add API subdomain CNAME

1. Click "Add record"
2. Type: `CNAME`
3. Name: `api`
4. Target: `dentscan-ai-backend-production.up.railway.app`
5. Proxy status: **DNS only** (gray cloud — Railway requires direct connection)
6. TTL: Auto
7. Save

### 1.3 Verify propagation

```powershell
nslookup -type=CNAME api.datunai.com
```

Should return Railway domain. May take 5-30 min.

## 2. Meta Cloud API (PRIMARY — already setup, update webhook)

### 2.1 Update webhook URL

1. Go to [business.facebook.com](https://business.facebook.com)
2. WhatsApp Manager → datun-ai-prod → Configuration
3. **Webhooks** → Edit
4. Callback URL: `https://api.datunai.com/webhook`
5. Verify token: same as Railway env `WHATSAPP_VERIFY_TOKEN`
6. Subscribe: `messages`, `message_status`, `account_update`
7. Click "Verify and save"

### 2.2 Verify Meta App Secret

- Meta Business Settings → System Users → Datun System User → Generate Token
- Confirm `META_APP_SECRET` is set on Railway (used for x-hub-signature-256 verification)

## 3. Gupshup (FALLBACK — when ready)

### 3.1 Account creation

1. [gupshup.io](https://gupshup.io) → Sign up
2. Use email: `dr.mayankvats09@gmail.com`
3. Verify business: company name "Datun Health", website `datunai.com`

### 3.2 Create WhatsApp app

1. Dashboard → WhatsApp → "Create New App"
2. Type: **Onboarding** (transactional, not marketing)
3. App name: `datun-ai-prod`
4. Phone number: existing `+91 70184 64796` OR new dedicated number
5. Submit business verification (24-48hr approval)

### 3.3 Submit templates

1. App → Templates → "Sync from Meta" (1-click for existing 6 templates)
2. OR manually submit:
   - `consultation_complete`
   - `internal_alert`
   - `3day_followup`
   - `7day_followup`
   - `appointment_reminder`
   - `weekly_tip`
3. Wait for approval

### 3.4 Get credentials

1. App → Settings → API Key → Copy
2. App name: e.g. `datun-ai-prod`
3. Source number: registered WhatsApp number with country code (e.g. `917018464796`)

### 3.5 Configure webhook

1. App → Webhooks → "Add Webhook"
2. URL: `https://api.datunai.com/webhook/gupshup`
3. Auto-generate webhook secret → copy
4. Subscribe: messages, message-event

### 3.6 Add to Railway

GUPSHUP_API_KEY=<from step 3.4>
GUPSHUP_APP_NAME=datun-ai-prod
GUPSHUP_SOURCE_NUMBER=917018464796
GUPSHUP_WEBHOOK_SECRET=<from step 3.5>

Server restart → whatsappClient auto-detects → adds Gupshup to provider chain.

## 4. AiSensy (EMERGENCY — Year 2)

Stub mode active until activated. To activate:

1. [aisensy.com](https://www.aisensy.com) → Sign up
2. Get API Key
3. Set Railway env: `AISENSY_API_KEY=<key>`
4. Restart → automatically added to chain as third tier

## 5. Testing the Setup

### 5.1 Verify webhook reachable

```powershell
curl https://api.datunai.com/webhook?hub.mode=subscribe^&hub.verify_token=YOUR_TOKEN^&hub.challenge=test123
```

Should return `test123`.

### 5.2 Trigger health check manually

```powershell
curl https://api.datunai.com/health
```

### 5.3 Verify DB tracking

Railway → PostgreSQL → Query:

```sql
SELECT provider, status, COUNT(*)
FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider, status;
```

### 5.4 Verify provider health

```sql
SELECT * FROM whatsapp_provider_health ORDER BY "lastHeartbeatAt" DESC;
```

## 6. Monitoring

- **Meta health**: business.facebook.com → System Health
- **Gupshup health**: gupshup.io dashboard → App → Analytics
- **Internal**: heartbeat cron updates `whatsapp_provider_health` every 30 min
- **Critical alert**: All 3 providers down → email to `hello@datunai.com`
- **Warning alert**: Primary down + fallback active → degraded mode email

## 7. Year 2 Roadmap

- Rate limit awareness per provider (track 80% of 1000/sec Meta limit)
- Cost tracking per provider (Meta vs Gupshup unit economics)
- Automatic provider weighting based on cost + reliability
- Multi-region failover (BSP in different geographic region)
