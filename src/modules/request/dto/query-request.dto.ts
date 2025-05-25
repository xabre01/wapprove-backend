import { IsOptional, IsString, IsNumber, IsIn, Min, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestStatus, UrgencyLevel } from '../../../common/enums';

export class QueryRequestDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  department_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  user_id?: number;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgency_level?: UrgencyLevel;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  current_approval_level?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

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
  @IsIn(['request_code', 'description', 'total_amount', 'status', 'urgency_level', 'request_date', 'created_at', 'updated_at'])
  sort_by?: string = 'created_at';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'desc';
} 