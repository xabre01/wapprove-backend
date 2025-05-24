import { IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApproverType } from '../../../common/enums';

export class UpdateApproverDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  user_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  department_id?: number;

  @IsOptional()
  @IsEnum(ApproverType)
  approver_type?: ApproverType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  approval_level?: number;
} 