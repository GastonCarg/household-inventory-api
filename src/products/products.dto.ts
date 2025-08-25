import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { Item } from './products.entity';

export class AddItemDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  location: string;

  @IsDateString()
  expireDate: string;

  @IsNumber()
  quantity: number;
}

export class IremResponseDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  location: string;

  @IsDateString()
  expireDate: string;

  @IsNumber()
  quantity: number;
}

export class ResponseProductsDto {
  @IsNumber()
  page: number;

  data: Item[];

  @IsNumber()
  total: number;

  @IsNumber()
  lastPage: number;

  @IsNumber()
  next: number | null;
}
