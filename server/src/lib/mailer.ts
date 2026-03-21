import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export const sendMail = async (options: MailOptions) => {
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    ...options,
  });
};

export default transporter;
