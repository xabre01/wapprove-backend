import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { TwilioService } from './twilio.service';
import { AdminOnly } from '../../common/decorators';

export class TestNotificationDto {
  phoneNumber: string;
  requestCode: string;
  requesterName: string;
  description: string;
  totalAmount: number;
  approvalLevel: string;
  requestItems?: Array<{
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    category: string;
  }>;
}

@Controller('notifications')
@AdminOnly()
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private twilioService: TwilioService,
  ) {}

  @Post('test/approval')
  async testApprovalNotification(@Body() testDto: TestNotificationDto) {
    const response = await this.twilioService.sendApprovalNotification(
      testDto.phoneNumber,
      testDto.requestCode,
      testDto.requesterName,
      testDto.description,
      testDto.totalAmount,
      testDto.approvalLevel,
      testDto.requestItems,
    );

    return {
      success: response.success,
      messageSid: response.messageSid,
      error: response.error,
    };
  }

  @Post('test/status-update')
  async testStatusUpdate(@Body() body: {
    phoneNumber: string;
    requestCode: string;
    status: string;
    approverName: string;
    notes?: string;
  }) {
    const response = await this.twilioService.sendApprovalStatusUpdate(
      body.phoneNumber,
      body.requestCode,
      body.status,
      body.approverName,
      body.notes,
    );

    return {
      success: response.success,
      messageSid: response.messageSid,
      error: response.error,
    };
  }

  @Get('history')
  async getNotificationHistory(
    @Query('user_id') userId?: number,
    @Query('request_id') requestId?: number,
  ) {
    return this.notificationService.getNotificationHistory(userId, requestId);
  }

  @Post(':id/retry')
  async retryNotification(@Param('id') id: number) {
    const success = await this.notificationService.retryFailedNotification(id);
    return { success };
  }
} 