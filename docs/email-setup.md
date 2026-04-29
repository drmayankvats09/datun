> **Note (29 Apr 2026):** DNS migrated from Hostinger to Cloudflare.
> All DNS records now managed at dash.cloudflare.com → datunai.com → DNS.
> For Resend records, set proxy status to "DNS only" (gray cloud) — email
> records must NOT be proxied through Cloudflare.

# Email Infrastructure Setup Guide — Datun AI

## 1. Resend Setup (PRIMARY — Already Done)

### Verify Domain (if not already done)

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click "Add Domain" → Enter `datunai.com`
3. Resend will show 3 DNS records to add:

### Add DNS Records in Cloudflare

1. Login to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select `datunai.com` → **DNS** tab → Records
3. Add these records (Resend dashboard shows exact values):

| Type  | Name                 | Value                                                  | TTL   |
| ----- | -------------------- | ------------------------------------------------------ | ----- |
| TXT   | `_dmarc`             | `v=DMARC1; p=quarantine; rua=mailto:hello@datunai.com` | 14400 |
| TXT   | `@` or `datunai.com` | `v=spf1 include:send.resend.com ~all`                  | 14400 |
| CNAME | `resend._domainkey`  | (copy exact value from Resend dashboard)               | 14400 |

4. Go back to Resend → Click "Verify" → Wait 5-30 min
5. Status should show "Verified" ✅

### Test Deliverability

After DNS propagation (can take up to 48 hours):

1. Go to [mail-tester.com](https://www.mail-tester.com)
2. Copy the test email address shown
3. Send a test email from Datun (trigger an OTP)
4. Check score — target: 9/10 or 10/10

## 2. AWS SES Setup (FALLBACK — When Ready)

### Step 1: AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com) → Create Account (if not exists)
2. Apply for AWS Activate (Founders tier — $1,000 free credits)

### Step 2: SES Configuration

1. AWS Console → Search "SES" → Amazon Simple Email Service
2. Region: Select `ap-south-1` (Mumbai — closest to Indian users)
3. Identities → Create Identity → Domain → `datunai.com`
4. Add the DNS records shown (similar to Resend — DKIM records)
5. Request Production Access:
   - SES → Account Dashboard → "Request production access"
   - Use case: "Transactional emails for dental healthcare platform"
   - Expected volume: "1000-5000 emails/month initially"

### Step 3: Create IAM User

1. AWS Console → IAM → Users → Create User
2. Name: `datun-ses-sender`
3. Attach policy: `AmazonSESFullAccess`
4. Create Access Key → Copy:
   - Access Key ID → `AWS_SES_ACCESS_KEY`
   - Secret Access Key → `AWS_SES_SECRET_KEY`

### Step 4: Railway Environment Variables

Add these 3 vars in Railway:
AWS_SES_ACCESS_KEY=AKIA...
AWS_SES_SECRET_KEY=...
AWS_SES_REGION

Server restart → emailClient auto-detects SES → adds to provider chain.

## 3. Railway Environment Variables (Complete List)

### Email-related vars (Railway Dashboard → Variables):

RESEND*API_KEY=re*... # Already set
RESEND_FROM_DOMAIN=datunai.com # Already set
ALERT_EMAIL_TO=hello@datunai.com # Already set
AWS_SES_ACCESS_KEY= # Set when SES ready
AWS_SES_SECRET_KEY= # Set when SES ready
AWS_SES_REGION=ap-south-1 # Set when SES ready

## 4. Testing Email System

### Test OTP Email

1. Go to datunai.com → Login → Enter email
2. Request OTP → Check inbox (+ spam folder)
3. Railway logs should show: `[EmailClient] Email sent { template: 'otp', provider: 'resend' }`

### Test Admin Alert

Trigger any error → hello@datunai.com should receive alert email.
Railway logs: `[EmailClient] Raw email sent { template: 'admin_alert', provider: 'resend' }`

### Verify DB Logging

Railway → PostgreSQL → Query:

```sql
SELECT * FROM email_logs ORDER BY "createdAt" DESC LIMIT 10;
```

Every email attempt should have a row with template, status, provider.

## 5. Monitoring

### Resend Dashboard

- [resend.com/emails](https://resend.com/emails) → See all sent emails
- Check: delivery rate, bounce rate, open rate
- Alert if bounce rate > 5%

### Database Query (debug)

```sql
-- OTP not received? Check:
SELECT * FROM email_logs
WHERE "to" = 'patient@gmail.com'
  AND template = 'otp'
ORDER BY "createdAt" DESC
LIMIT 5;

-- Daily email volume:
SELECT template, status, COUNT(*)
FROM email_logs
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY template, status;
```
