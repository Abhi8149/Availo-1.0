// Environment configuration for email service
// This file manages email service configuration for different environments

export const emailConfig = {
  // Resend API configuration
  resend: {
    apiKey: process.env.RESEND_API_KEY || 're_VhteabPa_5xc3tcYZSK2GJEBp9Kd5d1UN',
    
    // Email addresses configuration
    fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    fromName: process.env.RESEND_FROM_NAME || 'ShopStatus Team',
    
    // For testing without domain verification
    testEmail: 'piyushraj7308305@gmail.com',
    
    // Domain verification status
    isDomainVerified: process.env.RESEND_DOMAIN_VERIFIED === 'true',
  },
  
  // Email templates
  templates: {
    verification: {
      subject: 'Your ShopStatus Verification Code',
      getHtml: (code: string, isTestEmail = false, originalEmail = '') => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3B82F6; margin: 0;">ShopStatus</h1>
            <p style="color: #6B7280; margin: 5px 0;">Verification Code</p>
          </div>
          
          ${isTestEmail ? `
            <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
              <p style="color: #92400E; margin: 0;">
                <strong>📧 Test Mode:</strong> This verification code was requested for <strong>${originalEmail}</strong>
                but sent to your email for testing purposes.
              </p>
            </div>
          ` : ''}
          
          <div style="background: #F8FAFC; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0;">
            <p style="color: #475569; margin-bottom: 15px; font-size: 16px;">Your verification code is:</p>
            <div style="background: white; border: 2px solid #E2E8F0; border-radius: 8px; padding: 20px; display: inline-block;">
              <span style="font-size: 36px; font-weight: bold; color: #1E293B; letter-spacing: 6px; font-family: 'Courier New', monospace;">
                ${code}
              </span>
            </div>
          </div>
          
          <div style="background: #F1F5F9; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #334155; margin-top: 0;">Important Information:</h3>
            <ul style="color: #64748B; margin: 10px 0; padding-left: 20px;">
              <li>This code expires in <strong>10 minutes</strong></li>
              <li>Use this code to complete your registration</li>
              <li>Don't share this code with anyone</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
            <p style="color: #94A3B8; font-size: 14px; margin: 0;">
              If you didn't request this code, please ignore this email.
            </p>
            <p style="color: #94A3B8; font-size: 14px; margin: 5px 0 0 0;">
              © 2025 ShopStatus. All rights reserved.
            </p>
          </div>
        </div>
      `
    }
  }
};

// Helper function to get the appropriate sender email
export function getSenderEmail(): string {
  if (emailConfig.resend.isDomainVerified) {
    return emailConfig.resend.fromEmail;
  }
  
  // Use Resend's verified domain for testing
  return 'onboarding@resend.dev';
}

// Helper function to get recipient email (handles test mode)
export function getRecipientEmail(requestedEmail: string): {
  email: string;
  isTestEmail: boolean;
  originalEmail: string;
} {
  const normalizedRequested = requestedEmail.toLowerCase();
  const normalizedTest = emailConfig.resend.testEmail.toLowerCase();
  
  console.log('Email configuration check:', {
    isDomainVerified: emailConfig.resend.isDomainVerified,
    requestedEmail,
    envVar: process.env.RESEND_DOMAIN_VERIFIED
  });
  
  // If domain is verified, send to actual recipient
  if (emailConfig.resend.isDomainVerified) {
    console.log('Domain verified - sending to actual recipient:', requestedEmail);
    return {
      email: requestedEmail,
      isTestEmail: false,
      originalEmail: requestedEmail
    };
  }
  
  // If requested email is the test email, send normally
  if (normalizedRequested === normalizedTest) {
    console.log('Test email detected - sending normally:', requestedEmail);
    return {
      email: requestedEmail,
      isTestEmail: false,
      originalEmail: requestedEmail
    };
  }
  
  // Otherwise, redirect to test email
  console.log('Domain not verified - redirecting to test email');
  return {
    email: emailConfig.resend.testEmail,
    isTestEmail: true,
    originalEmail: requestedEmail
  };
}
