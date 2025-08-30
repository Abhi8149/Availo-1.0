# Convex Environment Setup Script (PowerShell)
# This script helps you configure environment variables for email service

Write-Host "🚀 ShopStatus Email Configuration Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $null = Get-Command npm -ErrorAction Stop
    Write-Host "✅ Node.js found" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js/npm not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Setting up environment variables for Convex..." -ForegroundColor Yellow
Write-Host ""

# Function to set environment variable
function Set-ConvexEnv {
    param(
        [string]$Key,
        [string]$Value,
        [string]$Description
    )
    
    Write-Host "Setting $Key..." -ForegroundColor Blue
    try {
        $result = npx convex env set $Key $Value 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $Key set successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to set $Key : $result" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error setting $Key : $_" -ForegroundColor Red
    }
}

# Current configuration (development/testing)
Write-Host "🔧 Development Configuration (Current)" -ForegroundColor Magenta
Write-Host "=====================================" -ForegroundColor Magenta

# Set development environment variables
Set-ConvexEnv "RESEND_API_KEY" "re_VhteabPa_5xc3tcYZSK2GJEBp9Kd5d1UN" "Resend API Key"
Set-ConvexEnv "RESEND_FROM_EMAIL" "onboarding@resend.dev" "From email address"
Set-ConvexEnv "RESEND_FROM_NAME" "ShopStatus Team" "From name"
Set-ConvexEnv "RESEND_DOMAIN_VERIFIED" "false" "Domain verification status"

Write-Host ""
Write-Host "🎯 Production Configuration (After Domain Setup)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "To switch to production with your own domain:" -ForegroundColor White
Write-Host ""
Write-Host "1. Set up your domain (see RESEND_DOMAIN_SETUP.md)" -ForegroundColor White
Write-Host "2. Run these commands:" -ForegroundColor White
Write-Host ""
Write-Host "   npx convex env set RESEND_FROM_EMAIL `"noreply@yourdomain.com`"" -ForegroundColor Gray
Write-Host "   npx convex env set RESEND_DOMAIN_VERIFIED `"true`"" -ForegroundColor Gray
Write-Host "   npx convex env set RESEND_API_KEY `"your_production_api_key`"" -ForegroundColor Gray
Write-Host ""

# Show current environment variables
Write-Host "📝 Current Environment Variables:" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow
try {
    npx convex env list
} catch {
    Write-Host "Run 'npx convex env list' to see current variables" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ Setup Complete!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host ""
Write-Host "Your email service is now configured for testing." -ForegroundColor White
Write-Host "All emails will be sent to: piyushraj7308305@gmail.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the registration flow" -ForegroundColor White
Write-Host "2. Check your email for verification codes" -ForegroundColor White
Write-Host "3. Set up custom domain when ready for production" -ForegroundColor White
Write-Host ""
Write-Host "📖 For detailed domain setup instructions, see:" -ForegroundColor Blue
Write-Host "   📄 RESEND_DOMAIN_SETUP.md" -ForegroundColor Cyan
