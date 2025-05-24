import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateLockStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  is_locked: boolean;
}
