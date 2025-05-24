import { IsOptional, IsString, IsNumber, IsIn, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApproverType } from '../../../common/enums';

export class QueryApproverDto {
  @IsOptional()
  @IsString()
  query?: string;

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  per_page?: number = 10;

  @IsOptional()
  @IsString()
  @IsIn(['user_id', 'department_id', 'approver_type', 'approval_level', 'created_at', 'updated_at'])
  sort_by?: string = 'created_at';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'desc';
} 