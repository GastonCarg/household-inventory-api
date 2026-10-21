import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Item } from './products.entity';
import { Unit, UNITS } from './units';

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
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @IsIn(UNITS)
  unit?: Unit;
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
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsIn(UNITS)
  unit?: Unit;

  @IsOptional()
  @Matches(/^\d{6,14}$/)
  barcode?: string;
}

export class AddItemsBulkDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AddItemDto)
  items: AddItemDto[];
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

  @IsIn(UNITS)
  unit: Unit;
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
