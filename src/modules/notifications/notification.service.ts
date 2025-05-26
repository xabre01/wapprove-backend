import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwilioService } from './twilio.service';
import { Notification } from '../../entities/notification.entity';
import { NotificationType } from '../../common/enums';

export interface ApprovalNotificationData {
  phoneNumber: string;
  userName: string;
  requestCode: string;
  requesterName: string;
  totalAmount: number;
  approvalLevel: string;
  userId: number;
  requestId: number;
}

export interface StatusUpdateNotificationData {
  phoneNumber: string;
  requestCode: string;
  status: string;
  approverName: string;
  notes?: string;
  userId: number;
  requestId: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private twilioService: TwilioService,
  ) {}

  /**
   * Send approval notification to specific user with complete data
   */
  async sendApprovalNotificationToUser(data: ApprovalNotificationData): Promise<void> {
    try {
      this.logger.log(`Sending approval notification to ${data.userName} (${data.phoneNumber})`);

      if (!data.phoneNumber) {
        this.logger.warn(`No phone number for user ${data.userName}`);
        return;
      }

      const response = await this.twilioService.sendApprovalNotification(
        data.phoneNumber,
        data.requestCode,
        data.requesterName,
        data.totalAmount,
        data.approvalLevel,
      );

      await this.saveNotificationLog(
        data.userId,
        data.requestId,
        NotificationType.PENDING_APPROVAL,
        `Approval request for ${data.requestCode}`,
        response.success,
      );

      if (response.success) {
        this.logger.log(`Approval notification sent to ${data.userName}`);
      } else {
        this.logger.error(`Failed to send notification to ${data.userName}: ${response.error}`);
      }
    } catch (error) {
      this.logger.error(`Error sending approval notification: ${error.message}`);
    }
  }

  /**
   * Send status update notification to specific user with complete data
   */
  async sendStatusUpdateNotificationToUser(data: StatusUpdateNotificationData): Promise<void> {
    try {
      this.logger.log(`Sending status update notification for request ${data.requestCode}`);

      if (!data.phoneNumber) {
        this.logger.warn(`No phone number for status update notification`);
        return;
      }

      const response = await this.twilioService.sendApprovalStatusUpdate(
        data.phoneNumber,
        data.requestCode,
        data.status,
        data.approverName,
        data.notes,
      );

      await this.saveNotificationLog(
        data.userId,
        data.requestId,
        NotificationType.REQUEST_APPROVED,
        `Status update: ${data.status}`,
        response.success,
      );

      if (response.success) {
        this.logger.log(`Status update notification sent successfully`);
      } else {
        this.logger.error(`Failed to send status update notification: ${response.error}`);
      }
    } catch (error) {
      this.logger.error(`Error sending status update notification: ${error.message}`);
    }
  }

  private async saveNotificationLog(
    userId: number,
    requestId: number,
    type: NotificationType,
    message: string,
    isSuccess: boolean,
  ): Promise<void> {
    try {
      const notification = this.notificationRepository.create({
        user_id: userId,
        request_id: requestId,
        notification_type: type,
        message,
        is_sent: isSuccess,
        sent_at: isSuccess ? new Date() : null,
        is_read: false,
      });

      await this.notificationRepository.save(notification);
    } catch (error) {
      this.logger.error(`Failed to save notification log: ${error.message}`);
    }
  }

  async getNotificationHistory(userId?: number, requestId?: number) {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user')
      .leftJoinAndSelect('notification.request', 'request')
      .orderBy('notification.created_at', 'DESC');

    if (userId) {
      queryBuilder.andWhere('notification.user_id = :userId', { userId });
    }

    if (requestId) {
      queryBuilder.andWhere('notification.request_id = :requestId', { requestId });
    }

    return queryBuilder.getMany();
  }

  async retryFailedNotification(notificationId: number): Promise<boolean> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId },
        relations: ['user', 'request'],
      });

      if (!notification || notification.is_sent) {
        return false;
      }

      // For retry, we need to reconstruct the original message
      // This is a simplified retry - in production you might want to store more context
      const response = await this.twilioService.sendWhatsAppMessage({
        to: notification.user.phone_number,
        body: notification.message,
      });

      // Update notification status
      notification.is_sent = response.success;
      notification.sent_at = response.success ? new Date() : null;

      await this.notificationRepository.save(notification);

      return response.success;
    } catch (error) {
      this.logger.error(`Failed to retry notification ${notificationId}: ${error.message}`);
      return false;
    }
  }
} 