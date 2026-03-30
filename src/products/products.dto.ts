import { Transform, Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Item } from './products.entity';

export class LocationRefDto {
  @Transform(({ value }: { value: unknown }) => String(value))
  @IsString()
  id: string;

  @IsString()
  name: string;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationRefDto)
  location?: LocationRefDto;

  @IsOptional()
  @IsDateString()
  expireDate?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;
}

export class AddItemDto {
  @IsString()
  title: string;

  @ValidateNested()
  @Type(() => LocationRefDto)
  location: LocationRefDto;

  @IsDateString()
  expireDate: string;

  @IsNumber()
  quantity: number;
}

export class ItemResponseDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  location: LocationRefDto;

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
