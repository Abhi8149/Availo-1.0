#!/bin/bash

# Convex Environment Setup Script
# This script helps you configure environment variables for email service

echo "🚀 ShopStatus Email Configuration Setup"
echo "========================================"
echo ""

# Check if Convex CLI is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Node.js/npm not found. Please install Node.js first."
    exit 1
fi

echo "📋 Setting up environment variables for Convex..."
echo ""

# Function to set environment variable
set_env_var() {
    local key=$1
    local value=$2
    local description=$3
    
    echo "Setting $key..."
    if npx convex env set "$key" "$value"; then
        echo "✅ $key set successfully"
    else
        echo "❌ Failed to set $key"
    fi
}

# Current configuration (development/testing)
echo "🔧 Development Configuration (Current)"
echo "=====================================>"

# Set development environment variables
set_env_var "RESEND_API_KEY" "re_VhteabPa_5xc3tcYZSK2GJEBp9Kd5d1UN" "Resend API Key"
set_env_var "RESEND_FROM_EMAIL" "onboarding@resend.dev" "From email address"
set_env_var "RESEND_FROM_NAME" "ShopStatus Team" "From name"
set_env_var "RESEND_DOMAIN_VERIFIED" "false" "Domain verification status"

echo ""
echo "🎯 Production Configuration (After Domain Setup)"
echo "================================================"
echo "To switch to production with your own domain:"
echo ""
echo "1. Set up your domain (see RESEND_DOMAIN_SETUP.md)"
echo "2. Run these commands:"
echo ""
echo "   npx convex env set RESEND_FROM_EMAIL \"noreply@yourdomain.com\""
echo "   npx convex env set RESEND_DOMAIN_VERIFIED \"true\""
echo "   npx convex env set RESEND_API_KEY \"your_production_api_key\""
echo ""

# Show current environment variables
echo "📝 Current Environment Variables:"
echo "================================"
npx convex env list 2>/dev/null || echo "Run 'npx convex env list' to see current variables"

echo ""
echo "✨ Setup Complete!"
echo "=================="
echo ""
echo "Your email service is now configured for testing."
echo "All emails will be sent to: piyushraj7308305@gmail.com"
echo ""
echo "Next steps:"
echo "1. Test the registration flow"
echo "2. Check your email for verification codes"
echo "3. Set up custom domain when ready for production"
echo ""
echo "📖 For detailed domain setup instructions, see:"
echo "   📄 RESEND_DOMAIN_SETUP.md"
