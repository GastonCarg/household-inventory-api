import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

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
