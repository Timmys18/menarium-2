import nodemailer from "nodemailer";
import { reportError } from "@/lib/logger";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
}

export function isEmailConfigured() {
  return smtpConfigured();
}

function createTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !from) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const from = process.env.SMTP_FROM?.trim();
  const transport = createTransport();
  if (!transport || !from) return false;

  try {
    await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, "<br>"),
    });
    return true;
  } catch (error) {
    reportError("email.send_failed", error);
    return false;
  }
}

export function appBaseUrl() {
  const url = process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";
  return url.replace(/\/$/, "");
}
