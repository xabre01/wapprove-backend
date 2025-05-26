import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { WhatsAppWebhookService } from './webhook.service';

export interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  MessageStatus?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

@Controller('notifications/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private twilioService: TwilioService,
    private whatsappWebhookService: WhatsAppWebhookService,
  ) {}

  @Post('whatsapp')
  async handleWhatsAppWebhook(
    @Body() payload: TwilioWebhookPayload,
    @Headers('x-twilio-signature') signature: string,
  ) {
    try {
      this.logger.log(`Received WhatsApp webhook: ${JSON.stringify(payload)}`);

      // Validate webhook signature for security
      if (!this.twilioService.validateWebhookSignature(signature, JSON.stringify(payload))) {
        this.logger.error('Invalid webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }

      // Handle different types of webhook events
      if (payload.MessageStatus) {
        // Message status update (delivered, read, failed, etc.)
        await this.whatsappWebhookService.handleMessageStatusUpdate(payload);
      } else if (payload.Body) {
        // Incoming message (approval commands)
        await this.whatsappWebhookService.handleIncomingMessage(payload);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Return success to prevent Twilio retries for application errors
      return { success: false, error: error.message };
    }
  }

  @Post('whatsapp/test')
  async testWebhook(@Body() payload: any) {
    this.logger.log(`Test webhook received: ${JSON.stringify(payload)}`);
    
    // For testing purposes - process without signature validation
    if (payload.Body) {
      await this.whatsappWebhookService.handleIncomingMessage(payload);
    }
    
    return { success: true, message: 'Test webhook processed' };
  }
} 