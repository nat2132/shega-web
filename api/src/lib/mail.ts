import nodemailer, { type Transporter } from "nodemailer";
import { env, mailEnabled } from "../config/env";

/**
 * Email seam. With SMTP_HOST configured the mail is really sent; otherwise the
 * message is logged (dev mode) and sendMail resolves with a marker object so
 * callers can fall back to returning reset data to the client.
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!mailEnabled()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
  }
  return transporter;
}

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailResult {
  delivered: boolean;
  via: "smtp" | "dev";
}

export async function sendMail(opts: MailOptions): Promise<MailResult> {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[mail:dev] to=${opts.to} subject="${opts.subject}"\n${opts.text}`);
    return { delivered: false, via: "dev" };
  }
  try {
    await transport.sendMail({
      from: `"${env.mailFromName}" <${env.mailFrom}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { delivered: true, via: "smtp" };
  } catch (err) {
    console.error("[mail] send failed:", err);
    return { delivered: false, via: "dev" };
  }
}