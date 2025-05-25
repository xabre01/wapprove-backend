import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestStatus, UrgencyLevel } from '../../../common/enums';
import { CreateRequestItemDto } from './create-request-item.dto';

export class CreateRequestDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  department_id: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  status_note?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgency_level?: UrgencyLevel;

  @IsDateString()
  @IsNotEmpty()
  request_date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequestItemDto)
  request_items: CreateRequestItemDto[];
} 