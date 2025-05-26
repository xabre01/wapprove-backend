import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwilioService, WhatsAppResponse } from './twilio.service';
import { Request } from '../../entities/request.entity';
import { Approver } from '../../entities/approver.entity';
import { User } from '../../entities/user.entity';
import { Notification } from '../../entities/notification.entity';
import { NotificationType } from '../../common/enums';
import { UserRole } from '../../common/enums';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(Request)
    private requestRepository: Repository<Request>,
    @InjectRepository(Approver)
    private approverRepository: Repository<Approver>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private twilioService: TwilioService,
  ) {}

  async sendApprovalNotifications(requestId: number): Promise<void> {
    try {
      this.logger.log(`Sending approval notifications for request ${requestId}`);

      const request = await this.requestRepository.findOne({
        where: { id: requestId },
        relations: ['user', 'user.department', 'request_items'],
      });

      if (!request) {
        throw new Error(`Request with ID ${requestId} not found`);
      }

      const nextApprovers = await this.getNextApprovers(request);
      
      if (nextApprovers.length === 0) {
        this.logger.log(`No approvers found for request ${request.request_code}`);
        return;
      }

      const totalAmount = request.request_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      for (const approver of nextApprovers) {
        await this.sendApprovalNotificationToApprover(
          request,
          approver,
          totalAmount,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send approval notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendStatusUpdateNotification(
    requestId: number,
    status: string,
    approverName: string,
    notes?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Sending status update notification for request ${requestId}`);

      const request = await this.requestRepository.findOne({
        where: { id: requestId },
        relations: ['user'],
      });

      if (!request || !request.user.phone_number) {
        this.logger.warn(`Request or user phone number not found for request ${requestId}`);
        return;
      }

      const response = await this.twilioService.sendApprovalStatusUpdate(
        request.user.phone_number,
        request.request_code,
        status,
        approverName,
        notes,
      );

      await this.saveNotificationLog(
        request.user.id,
        request.id,
        NotificationType.REQUEST_APPROVED,
        `Status update: ${status}`,
        response.success,
      );
    } catch (error) {
      this.logger.error(`Failed to send status update notification: ${error.message}`, error.stack);
    }
  }

  private async sendApprovalNotificationToApprover(
    request: Request,
    approver: Approver,
    totalAmount: number,
  ): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: approver.user_id },
      });

      if (!user || !user.phone_number) {
        this.logger.warn(`User or phone number not found for approver ${approver.user_id}`);
        return;
      }

      const approvalLevel = this.getApprovalLevelName(approver.approval_level);
      
      const response = await this.twilioService.sendApprovalNotification(
        user.phone_number,
        request.request_code,
        request.user.name,
        totalAmount,
        approvalLevel,
      );

      await this.saveNotificationLog(
        user.id,
        request.id,
        NotificationType.PENDING_APPROVAL,
        `Approval request for ${request.request_code}`,
        response.success,
      );

      if (response.success) {
        this.logger.log(`Approval notification sent to ${user.name} (${user.phone_number})`);
      } else {
        this.logger.error(`Failed to send notification to ${user.name}: ${response.error}`);
      }
    } catch (error) {
      this.logger.error(`Error sending notification to approver ${approver.user_id}: ${error.message}`);
    }
  }

  private async getNextApprovers(request: Request): Promise<Approver[]> {
    const currentLevel = this.getCurrentApprovalLevel(request.status);
    
    if (currentLevel === 0) {
      return [];
    }

    // Get approvers for the current level
    const approvers = await this.approverRepository.find({
      where: [
        {
          department_id: request.user.department_id,
          approval_level: currentLevel,
        },
        {
          user_id: request.user.department_id, // For user-specific approvers
          approval_level: currentLevel,
        },
      ],
      relations: ['user', 'department'],
    });

    // For admin/purchasing, they can approve at any level
    if (currentLevel === 999) { // Final level
      const adminPurchasingUsers = await this.userRepository.find({
        where: [
          { role: UserRole.ADMIN },
          { role: UserRole.PURCHASING },
        ],
      });

      // Convert to approver format
      const virtualApprovers: Partial<Approver>[] = adminPurchasingUsers.map(user => ({
        id: 0,
        user_id: user.id,
        department_id: null,
        approval_level: 999,
        approver_type: 'USER' as any,
        created_at: new Date(),
        updated_at: new Date(),
        user: user,
        department: null,
      }));

      return virtualApprovers as Approver[];
    }

    return approvers;
  }

  private getCurrentApprovalLevel(status: string): number {
    const levelMap: Record<string, number> = {
      'PENDING_MANAGER_APPROVAL': 1,
      'PENDING_DIRECTOR_APPROVAL': 2,
      'PENDING_PURCHASING_APPROVAL': 999,
    };

    return levelMap[status] || 0;
  }

  private getApprovalLevelName(level: number): string {
    const levelNames: Record<number, string> = {
      1: 'Manager Approval',
      2: 'Director Approval',
      999: 'Purchasing Approval',
    };

    return levelNames[level] || `Level ${level} Approval`;
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

      let response: WhatsAppResponse;

      if (notification.notification_type === NotificationType.PENDING_APPROVAL) {
        const request = await this.requestRepository.findOne({
          where: { id: notification.request_id },
          relations: ['user', 'request_items'],
        });

        const totalAmount = request.request_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const approvalLevel = this.getApprovalLevelName(1); // Default to level 1

        response = await this.twilioService.sendApprovalNotification(
          notification.user.phone_number,
          request.request_code,
          request.user.name,
          totalAmount,
          approvalLevel,
        );
      } else {
        response = await this.twilioService.sendWhatsAppMessage({
          to: notification.user.phone_number,
          body: notification.message,
        });
      }

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