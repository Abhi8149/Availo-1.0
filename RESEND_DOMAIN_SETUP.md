# Resend Domain Setup Guide

## Overview
To send emails to any recipient (not just your own email), you need to verify a domain with Resend. This guide walks you through the complete process.

## Step 1: Purchase/Setup a Domain

### Option A: Use an Existing Domain
If you already own a domain (like `shopstatus.com`), you can use it.

### Option B: Get a Free Domain
1. **Freenom** (free domains): `.tk`, `.ml`, `.ga`, `.cf`
2. **GitHub Pages**: Use `<username>.github.io`
3. **Vercel**: Get a free `.vercel.app` domain when you deploy

### Option C: Purchase a Domain
- **Namecheap**: $8-12/year
- **GoDaddy**: $10-15/year
- **Google Domains**: $12/year

## Step 2: Add Domain to Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `shopstatus.com`)
4. Resend will provide DNS records to add

## Step 3: Configure DNS Records

Add these DNS records to your domain provider:

### Required Records:
```
Type: MX
Name: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10

Type: TXT
Name: @
Value: "v=spf1 include:amazonses.com ~all"

Type: CNAME
Name: [resend-provided-value]
Value: [resend-provided-value]

Type: TXT
Name: _dmarc
Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@resend.com"
```

## Step 4: Wait for Verification
- DNS propagation takes 24-48 hours
- Resend will automatically verify once records are detected
- Check status in Resend dashboard

## Step 5: Update Convex Configuration

Once domain is verified, update the email configuration:

### Environment Variables (Recommended)
Add to your Convex environment:

```bash
# In Convex dashboard or .env
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Update auth.ts
```typescript
from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com'
```

## Quick Setup for Testing (Alternative)

### Option 1: Use Resend's Verified Domain
Keep using `onboarding@resend.dev` (current setup) - works but limited

### Option 2: Add Team Members
In Resend dashboard:
1. Go to Settings → Team
2. Add email addresses that can receive emails
3. These emails will work without domain verification

### Option 3: Use Gmail SMTP (Fallback)
```typescript
// Alternative email service using Gmail
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password' // Generate in Google Account settings
  }
});
```

## Production-Ready Setup

### 1. Environment Configuration
```typescript
// convex/environment.ts
export const emailConfig = {
  apiKey: process.env.RESEND_API_KEY!,
  fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@shopstatus.com',
  fromName: 'ShopStatus Team'
};
```

### 2. Updated auth.ts
```typescript
import { emailConfig } from './environment';

// In sendVerificationCode action:
from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
```

### 3. Add Environment Variables in Convex
```bash
npx convex env set RESEND_API_KEY your_actual_api_key
npx convex env set RESEND_FROM_EMAIL noreply@yourdomain.com
```

## Verification Checklist

- [ ] Domain purchased/configured
- [ ] DNS records added to domain provider
- [ ] Domain verified in Resend dashboard (green checkmark)
- [ ] Environment variables set in Convex
- [ ] auth.ts updated with new from address
- [ ] Test email sent successfully to any recipient

## Troubleshooting

### Common Issues:
1. **DNS not propagated**: Wait 24-48 hours
2. **Wrong DNS records**: Double-check values from Resend
3. **API key issues**: Generate new key in Resend dashboard
4. **Domain not verified**: Check Resend dashboard status

### Testing Commands:
```bash
# Check DNS propagation
nslookup -type=MX yourdomain.com

# Test from terminal
dig TXT yourdomain.com
```

## Cost Breakdown

### Free Tier (Current):
- 100 emails/day to your own email
- 3,000 emails/month total

### With Verified Domain:
- 3,000 emails/month free
- $0.40/1000 emails after that
- No recipient restrictions

## Next Steps

1. **Immediate**: Use current fallback system for testing
2. **Short-term**: Add team member emails in Resend
3. **Long-term**: Set up custom domain for production

Choose the approach that fits your timeline and budget!
