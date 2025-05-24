import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Approver, User, Department } from '../../entities';
import { ApproverService } from './approver.service';
import { ApproverController, DepartmentApproverController } from './approver.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Approver, User, Department])],
  controllers: [ApproverController, DepartmentApproverController],
  providers: [ApproverService],
  exports: [ApproverService],
})
export class ApproverModule {} 