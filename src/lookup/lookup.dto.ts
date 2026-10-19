import { IsBase64, IsIn, IsString, MaxLength } from 'class-validator';

export class ImageLookupDto {
  // ~4MB of base64; the front sends a resized ~768px JPEG, usually well under 300KB
  @IsString()
  @IsBase64()
  @MaxLength(4_000_000)
  imageBase64: string;

  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  mimeType: string;
}

export interface SuggestedLocation {
  id: string;
  name: string;
}

export interface BarcodeLookupResponse {
  source: 'catalog' | 'openfoodfacts' | 'none';
  barcode: string;
  title: string | null;
  brand: string | null;
  imageUrl: string | null;
  suggestedLocation: SuggestedLocation | null;
  suggestedShelfLifeDays: number | null;
}

export interface ImageLookupResponse {
  title: string;
  category: string | null;
  suggestedLocation: SuggestedLocation | null;
  suggestedShelfLifeDays: number | null;
  confidence: number;
}
