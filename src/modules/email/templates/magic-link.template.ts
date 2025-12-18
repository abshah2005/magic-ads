export const magicLinkTemplate = (magicLinkUrl: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        .email-content { background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .magic-link-btn { 
          display: inline-block; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 15px 30px; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: bold; 
          margin: 20px 0; 
          text-align: center;
          transition: transform 0.2s ease;
        }
        .magic-link-btn:hover { transform: translateY(-2px); }
        .security-note { 
          background-color: #fff3cd; 
          border: 1px solid #ffeaa7; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .footer { 
          background-color: #f8f9fa; 
          padding: 20px; 
          text-align: center; 
          color: #666; 
          font-size: 14px; 
        }
        .expiry-info { 
          color: #e74c3c; 
          font-weight: bold; 
          margin: 10px 0; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="email-content">
          <div class="header">
            <h1>🔐 Your Magic Link</h1>
            <p>Secure login without passwords</p>
          </div>
          <div class="content">
            <h2>Hello there! 👋</h2>
            <p>You requested a magic link to sign in to your account. Click the button below to log in securely:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLinkUrl}" class="magic-link-btn">
                🚀 Sign In with Magic Link
              </a>
            </div>
            
            <div class="security-note">
              <strong>⚡ Security Information:</strong>
              <ul>
                <li>This link will expire in <span class="expiry-info">15 minutes</span></li>
                <li>This link can only be used once</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <div style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px; margin: 15px 0;">
              ${magicLinkUrl}
            </div>
            
            <p>Need help? Contact our support team at support@yourapp.com</p>
          </div>
          <div class="footer">
            <p>This email was sent from a secure system. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Your App Name. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};