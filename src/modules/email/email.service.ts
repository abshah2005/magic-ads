import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SendEmailDto } from './dto/send-email.dto';
export * from './interfaces/email.interface';
import {  loginEmailTemplate } from './templates/login-email.template';
import{signupEmailTemplate} from "./templates/signup-email.template"
import { magicLinkTemplate } from './templates/magic-link.template';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      port:465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,

      },
    });
  }

  async sendEmail(sendEmailDto: SendEmailDto): Promise<void> {
    const { to, subject, html, text } = sendEmailDto;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
      text,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendMagicLinkEmail(email: string, magicToken: string): Promise<void> {
    const magicLinkUrl = `${process.env.FRONTEND_URL}?token=${magicToken}`;
    const template = magicLinkTemplate(magicLinkUrl);
    await this.sendEmail({
      to: email,
      subject: ':closed_lock_with_key: Your Magic Link - Sign In Securely',
      html: template,
    });
  }

  async sendSignupEmail(email: string, username: string): Promise<void> {
    const template = signupEmailTemplate(username);
    await this.sendEmail({
      to: email,
      subject: 'Welcome to Our Platform!',
      html: template,
    });
  }

  async sendLoginEmail(email: string, username: string): Promise<void> {
    const template = loginEmailTemplate(username);
    await this.sendEmail({
      to: email,
      subject: 'Login Notification',
      html: template,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });
  }
}