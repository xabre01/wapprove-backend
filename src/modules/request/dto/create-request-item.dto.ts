import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ItemCategory } from '../../../common/enums';

export class CreateRequestItemDto {
  @IsString()
  @IsNotEmpty()
  item_name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unit_price: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total_price: number;

  @IsOptional()
  @IsString()
  specifications?: string;

  @IsEnum(ItemCategory)
  @IsNotEmpty()
  category: ItemCategory;

  @IsOptional()
  @IsDateString()
  requested_delivery_date?: string;
} 