import { registerAs } from '@nestjs/config';

export default registerAs('twilio', () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  webhookUrl: process.env.WHATSAPP_WEBHOOK_URL,
  webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET,
})); 