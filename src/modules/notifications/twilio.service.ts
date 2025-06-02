import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import * as crypto from 'crypto';

export interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
}

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private readonly client: Twilio;
  private readonly whatsappNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('twilio.accountSid');
    const authToken = this.configService.get<string>('twilio.authToken');
    this.whatsappNumber = this.configService.get<string>('twilio.whatsappNumber');

    this.client = new Twilio(accountSid, authToken);
    this.logger.log('Twilio WhatsApp service initialized');
  }

  async sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      this.logger.log(`Sending WhatsApp message to ${message.to}`);
      
      const messageOptions: any = {
        from: this.whatsappNumber,
        to: `whatsapp:${message.to}`,
        body: message.body,
      };

      if (message.mediaUrl) {
        messageOptions.mediaUrl = [message.mediaUrl];
      }

      const twilioMessage = await this.client.messages.create(messageOptions);

      this.logger.log(`WhatsApp message sent successfully. SID: ${twilioMessage.sid}`);
      
      return {
        success: true,
        messageSid: twilioMessage.sid,
      };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`, error.stack);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendApprovalNotification(
    phoneNumber: string,
    requestCode: string,
    requesterName: string,
    description: string,
    totalAmount: number,
    approvalLevel: string,
    requestItems?: Array<{
      item_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      category: string;
    }>,
  ): Promise<WhatsAppResponse> {
    const message = this.formatApprovalMessage(
      requestCode,
      requesterName,
      description,
      totalAmount,
      approvalLevel,
      requestItems,
    );

    return this.sendWhatsAppMessage({
      to: phoneNumber,
      body: message,
    });
  }

  async sendApprovalStatusUpdate(
    phoneNumber: string,
    requestCode: string,
    status: string,
    approverName: string,
    notes?: string,
  ): Promise<WhatsAppResponse> {
    const message = this.formatStatusUpdateMessage(
      requestCode,
      status,
      approverName,
      notes,
    );

    return this.sendWhatsAppMessage({
      to: phoneNumber,
      body: message,
    });
  }

  private formatApprovalMessage(
    requestCode: string,
    requesterName: string,
    description: string,
    totalAmount: number,
    approvalLevel: string,
    requestItems?: Array<{
      item_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      category: string;
    }>,
  ): string {
    let message = `🔔 *APPROVAL REQUEST*

📋 Request: ${requestCode}
👤 Requester: ${requesterName}
📝 Description: ${description}
💰 Total Amount: Rp ${this.formatNumber(totalAmount)}
📊 Level: ${approvalLevel}`;

    // Add request items details
    if (requestItems && requestItems.length > 0) {
      message += `\n\n📦 *ITEM DETAILS:*`;
      
      requestItems.forEach((item, index) => {
        message += `\n\n${index + 1}. ${item.item_name}`;
        message += `\n   📁 Category: ${item.category}`;
        message += `\n   🔢 Qty: ${item.quantity}`;
        message += `\n   💵 Unit Price: Rp ${this.formatNumber(item.unit_price)}`;
        message += `\n   💰 Total: Rp ${this.formatNumber(item.total_price)}`;
      });
    }

    message += `\n\nPlease review and approve/reject this request.

Reply with:
• *APPROVE ${requestCode}* - to approve
• *REJECT ${requestCode} [reason]* - to reject

Thank you! 🙏`;

    return message;
  }

  private formatStatusUpdateMessage(
    requestCode: string,
    status: string,
    approverName: string,
    notes?: string,
  ): string {
    const statusEmoji = this.getStatusEmoji(status);
    
    let message = `${statusEmoji} *REQUEST UPDATE*

📋 Request: ${requestCode}
📊 Status: ${status}
👤 By: ${approverName}`;

    if (notes) {
      message += `\n📝 Notes: ${notes}`;
    }

    return message;
  }

  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      'MANAGER_APPROVED': '✅',
      'DIRECTOR_APPROVED': '✅',
      'FULLY_APPROVED': '🎉',
      'REJECTED': '❌',
      'ON_HOLD': '⏸️',
      'IN_PROCESS': '🔄',
      'COMPLETED': '✅',
      'CANCELLED': '🚫',
    };

    return emojiMap[status] || '📋';
  }

  validateWebhookSignature(signature: string, body: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>('twilio.webhookSecret');
      
      // For development/testing, skip validation if no secret is set
      if (!webhookSecret || webhookSecret === 'your-webhook-secret-key') {
        this.logger.warn('Webhook signature validation skipped - no secret configured');
        return true;
      }

      // Manual signature validation using crypto
      const expectedSignature = crypto
        .createHmac('sha1', webhookSecret)
        .update(body)
        .digest('base64');

      return signature === expectedSignature;
    } catch (error) {
      this.logger.error(`Webhook signature validation failed: ${error.message}`);
      return false;
    }
  }

  private formatNumber(amount: number): string {
    return new Intl.NumberFormat('id-ID').format(amount);
  }
} 