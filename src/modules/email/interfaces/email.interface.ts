export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailConfig {
  service: string;
  user: string;
  pass: string;
}