import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    try {
      await this.emailService.sendEmail(sendEmailDto);
      return { message: 'Email sent successfully' };
    } catch (error) {
      return { message: 'Failed to send email', error: error.message };
    }
  }

  @Post('signup')
  async sendSignupEmail(@Body() body: { email: string; username: string }) {
    try {
      await this.emailService.sendSignupEmail(body.email, body.username);
      return { message: 'Signup email sent successfully' };
    } catch (error) {
      return { message: 'Failed to send signup email', error: error.message };
    }
  }

  @Post('login')
  async sendLoginEmail(@Body() body: { email: string; username: string }) {
    try {
      await this.emailService.sendLoginEmail(body.email, body.username);
      return { message: 'Login email sent successfully' };
    } catch (error) {
      return { message: 'Failed to send login email', error: error.message };
    }
  }

  @Post('password-reset')
  async sendPasswordResetEmail(@Body() body: { email: string; resetToken: string }) {
    try {
      await this.emailService.sendPasswordResetEmail(body.email, body.resetToken);
      return { message: 'Password reset email sent successfully' };
    } catch (error) {
      return { message: 'Failed to send password reset email', error: error.message };
    }
  }
}