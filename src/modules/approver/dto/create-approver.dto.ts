import { IsNotEmpty, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApproverType } from '../../../common/enums';

export class CreateApproverDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  department_id: number;

  @IsEnum(ApproverType)
  @IsNotEmpty()
  approver_type: ApproverType;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  approval_level: number;
} 