import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwilioWebhookPayload } from './webhook.controller';
import { TwilioService } from './twilio.service';
import { Request } from '../../entities/request.entity';
import { User } from '../../entities/user.entity';
import { Notification } from '../../entities/notification.entity';
import { RequestService } from '../request/request.service';
import { ApproveRequestDto } from '../request/dto/approve-request.dto';
import { RejectRequestDto } from '../request/dto/reject-request.dto';
import { CurrentUserData } from '../../common/interfaces';

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    @InjectRepository(Request)
    private requestRepository: Repository<Request>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private twilioService: TwilioService,
    private requestService: RequestService,
  ) {}

  async handleMessageStatusUpdate(payload: TwilioWebhookPayload): Promise<void> {
    try {
      this.logger.log(`Processing message status update: ${payload.MessageStatus} for ${payload.MessageSid}`);

      // Find notification by message SID (you might need to store this in notification entity)
      const notification = await this.notificationRepository.findOne({
        where: { message: payload.MessageSid }, // Assuming you store MessageSid in message field
      });

      if (notification) {
        switch (payload.MessageStatus) {
          case 'delivered':
            notification.is_sent = true;
            notification.sent_at = new Date();
            break;
          case 'read':
            notification.is_read = true;
            notification.read_at = new Date();
            break;
          case 'failed':
          case 'undelivered':
            notification.is_sent = false;
            break;
        }

        await this.notificationRepository.save(notification);
        this.logger.log(`Updated notification ${notification.id} status`);
      }
    } catch (error) {
      this.logger.error(`Failed to process message status update: ${error.message}`, error.stack);
    }
  }

  async handleIncomingMessage(payload: TwilioWebhookPayload): Promise<void> {
    try {
      this.logger.log(`Processing incoming message from ${payload.From}: ${payload.Body}`);

      // Extract phone number (remove whatsapp: prefix)
      const phoneNumber = payload.From.replace('whatsapp:', '');
      
      // Find user by phone number
      const user = await this.userRepository.findOne({
        where: { phone_number: phoneNumber },
      });

      if (!user) {
        this.logger.warn(`User not found for phone number: ${phoneNumber}`);
        await this.sendErrorMessage(phoneNumber, 'User not found. Please contact administrator.');
        return;
      }

      // Parse command from message
      const command = this.parseCommand(payload.Body);
      
      if (!command) {
        await this.sendHelpMessage(phoneNumber);
        return;
      }

      // Process the command
      await this.processApprovalCommand(user, command, phoneNumber);
    } catch (error) {
      this.logger.error(`Failed to process incoming message: ${error.message}`, error.stack);
      
      // Send error message to user
      const phoneNumber = payload.From.replace('whatsapp:', '');
      await this.sendErrorMessage(phoneNumber, 'An error occurred while processing your request.');
    }
  }

  private parseCommand(message: string): { action: string; requestCode: string; reason?: string } | null {
    const text = message.trim().toUpperCase();
    
    // APPROVE REQ-20241201-0001
    const approveMatch = text.match(/^APPROVE\s+(REQ-\d{8}-\d{4})$/);
    if (approveMatch) {
      return {
        action: 'APPROVE',
        requestCode: approveMatch[1],
      };
    }

    // REJECT REQ-20241201-0001 Budget exceeded
    const rejectMatch = text.match(/^REJECT\s+(REQ-\d{8}-\d{4})\s+(.+)$/);
    if (rejectMatch) {
      return {
        action: 'REJECT',
        requestCode: rejectMatch[1],
        reason: rejectMatch[2],
      };
    }

    return null;
  }

  private async processApprovalCommand(
    user: User,
    command: { action: string; requestCode: string; reason?: string },
    phoneNumber: string,
  ): Promise<void> {
    try {
      // Find the request
      const request = await this.requestRepository.findOne({
        where: { request_code: command.requestCode },
        relations: ['user'],
      });

      if (!request) {
        await this.sendErrorMessage(phoneNumber, `Request ${command.requestCode} not found.`);
        return;
      }

      // Create current user data
      const currentUserData: CurrentUserData = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      // Process the approval/rejection
      if (command.action === 'APPROVE') {
        const approveDto: ApproveRequestDto = {
          notes: 'Approved via WhatsApp',
        };
        
        await this.requestService.approve(request.id, approveDto, currentUserData);
        await this.sendSuccessMessage(phoneNumber, `Request ${command.requestCode} has been approved successfully! ✅`);
      } else if (command.action === 'REJECT') {
        const rejectDto: RejectRequestDto = {
          notes: command.reason || 'Rejected via WhatsApp',
        };
        
        await this.requestService.reject(request.id, rejectDto, currentUserData);
        await this.sendSuccessMessage(phoneNumber, `Request ${command.requestCode} has been rejected. ❌`);
      }

      this.logger.log(`${command.action} action completed for request ${command.requestCode} by user ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to process approval command: ${error.message}`, error.stack);
      await this.sendErrorMessage(phoneNumber, `Failed to ${command.action.toLowerCase()} request ${command.requestCode}. Please try again or contact administrator.`);
    }
  }

  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    const helpMessage = `🤖 *WApprove Bot Commands*

To approve a request:
*APPROVE REQ-YYYYMMDD-XXXX*

To reject a request:
*REJECT REQ-YYYYMMDD-XXXX [reason]*

Example:
• APPROVE REQ-20241201-0001
• REJECT REQ-20241201-0001 Budget exceeded

Need help? Contact administrator.`;

    await this.twilioService.sendWhatsAppMessage({
      to: phoneNumber,
      body: helpMessage,
    });
  }

  private async sendErrorMessage(phoneNumber: string, message: string): Promise<void> {
    await this.twilioService.sendWhatsAppMessage({
      to: phoneNumber,
      body: `❌ *Error*\n\n${message}`,
    });
  }

  private async sendSuccessMessage(phoneNumber: string, message: string): Promise<void> {
    await this.twilioService.sendWhatsAppMessage({
      to: phoneNumber,
      body: message,
    });
  }
}