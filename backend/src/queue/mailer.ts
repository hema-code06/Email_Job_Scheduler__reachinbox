import nodemailer, { Transporter } from "nodemailer";
import { Sender } from "../generated/prisma/client";

const cache = new Map<string, Transporter>();

export function getTransport(sender: Sender) {
  let transport = cache.get(sender.id);
  if (!transport) {
    transport = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      auth: { user: sender.smtpUser, pass: sender.smtpPass },
    });
    cache.set(sender.id, transport);
  }
  return transport;
}