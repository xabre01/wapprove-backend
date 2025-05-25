import { IsString, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestStatus, UrgencyLevel } from '../../../common/enums';
import { CreateRequestItemDto } from './create-request-item.dto';

export class UpdateRequestDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status_note?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgency_level?: UrgencyLevel;

  @IsOptional()
  @IsDateString()
  request_date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequestItemDto)
  request_items?: CreateRequestItemDto[];
} 