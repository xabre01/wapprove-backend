import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { DepartmentModule } from './modules/department/department.module';
import { UserModule } from './modules/user/user.module';
import { AccountModule } from './modules/account/account.module';
import { ApproverModule } from './modules/approver/approver.module';
import { RequestModule } from './modules/request/request.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { entities } from './entities';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import twilioConfig from './config/twilio.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, twilioConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
        entities,
      }),
    }),
    AuthModule,
    DepartmentModule,
    UserModule,
    AccountModule,
    ApproverModule,
    RequestModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
