import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { WhatsAppWebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { TwilioService } from './twilio.service';
import { Notification } from '../../entities/notification.entity';
import { Request } from '../../entities/request.entity';
import { User } from '../../entities/user.entity';
import { Approver } from '../../entities/approver.entity';
import { RequestModule } from '../request/request.module';
import twilioConfig from '../../config/twilio.config';

@Module({
  imports: [
    ConfigModule.forFeature(twilioConfig),
    TypeOrmModule.forFeature([
      Notification,
      Request,
      User,
      Approver,
    ]),
    forwardRef(() => RequestModule),
  ],
  controllers: [NotificationController, WebhookController],
  providers: [
    NotificationService,
    WhatsAppWebhookService,
    TwilioService,
  ],
  exports: [
    NotificationService,
    TwilioService,
  ],
})
export class NotificationModule {} 