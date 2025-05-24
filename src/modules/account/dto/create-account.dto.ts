import { IsString, IsNotEmpty, MinLength, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAccountDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
