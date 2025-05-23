import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsIn,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone_number?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  department_id?: number;

  @IsOptional()
  @IsString()
  @IsIn(['ADMIN', 'MANAGER', 'STAFF', 'DIRECTOR', 'PURCHASING'])
  role?: string = 'STAFF';

  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;
}
