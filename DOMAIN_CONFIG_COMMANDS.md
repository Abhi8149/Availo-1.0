# Domain Configuration Commands

## Step 1: Set Your Verified Domain Email
Replace `YOUR_DOMAIN.com` with your actual verified domain:

```bash
# Set your verified domain email address
npx convex env set RESEND_FROM_EMAIL "noreply@YOUR_DOMAIN.com"

# Alternative email addresses you can use:
# npx convex env set RESEND_FROM_EMAIL "hello@YOUR_DOMAIN.com"
# npx convex env set RESEND_FROM_EMAIL "support@YOUR_DOMAIN.com"
# npx convex env set RESEND_FROM_EMAIL "no-reply@YOUR_DOMAIN.com"
```

## Step 2: Set Your Production API Key (Optional)
If you have a production Resend API key, set it:

```bash
npx convex env set RESEND_API_KEY "your_production_api_key"
```

## Step 3: Verify Configuration
```bash
npx convex env list
```

## Current Status
✅ RESEND_DOMAIN_VERIFIED = true
✅ RESEND_FROM_NAME = "ShopStatus Team"
✅ RESEND_FROM_EMAIL = "noreply@shopstatus.dev"
✅ Domain Configuration = COMPLETE!

## Your Domain Configuration
Domain: shopstatus.dev
Email: noreply@shopstatus.dev
Status: ✅ Configured and Ready

## Test the Configuration
After setting your domain email, test it by:
1. Running the app
2. Trying to register with any email address
3. The verification code should be sent to the actual email address (not redirected to test email)
