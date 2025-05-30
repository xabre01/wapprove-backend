import { IsString, IsNotEmpty } from 'class-validator';

export class RejectRequestDto {
  @IsString()
  @IsNotEmpty()
  notes: string;
} 