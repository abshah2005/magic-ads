export const loginEmailTemplate = (username: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .info { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Login Notification</h1>
        </div>
        <div class="content">
          <h2>Hi ${username}!</h2>
          <p>We noticed a new login to your account.</p>
          <div class="info">
            <strong>Time:</strong> ${new Date().toLocaleString()}<br>
            <strong>Device:</strong> Web Browser
          </div>
          <p>If this wasn't you, please contact our support team immediately.</p>
          <p>Best regards,<br>Security Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
};