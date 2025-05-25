import { IsOptional, IsString } from 'class-validator';

export class HoldRequestDto {
  @IsOptional()
  @IsString()
  notes?: string;
} 