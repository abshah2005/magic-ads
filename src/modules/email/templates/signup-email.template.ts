export const signupEmailTemplate = (username: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Our Platform!</h1>
        </div>
        <div class="content">
          <h2>Hi ${username}!</h2>
          <p>Thank you for signing up! We're excited to have you on board.</p>
          <p>You can now access all our features and start your journey with us.</p>
          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Get Started</a>
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Best regards,<br>The Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
};