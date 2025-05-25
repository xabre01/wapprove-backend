import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestService } from './request.service';
import { RequestController } from './request.controller';
import { Request, RequestItem, User, Department, Approver } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Request, RequestItem, User, Department, Approver])],
  controllers: [RequestController],
  providers: [RequestService],
  exports: [RequestService],
})
export class RequestModule {} 