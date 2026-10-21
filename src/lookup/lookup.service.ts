import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogService } from '../catalog/catalog.service';
import { Location } from '../locations/locations.entity';
import { DEFAULT_UNIT, isUnit, UNITS } from '../products/units';
import { BarcodeLookupResponse, ImageLookupDto, ImageLookupResponse } from './lookup.dto';
import { estimateShelfLifeDays } from './shelf-life';

const OFF_FIELDS =
  'product_name,product_name_es,generic_name_es,brands,quantity,categories_tags,image_front_small_url';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 8000;

interface OpenFoodFactsResponse {
  status: number;
  product?: {
    product_name?: string;
    product_name_es?: string;
    generic_name_es?: string;
    brands?: string;
    quantity?: string;
    categories_tags?: string[];
    image_front_small_url?: string;
  };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

interface GeminiProduct {
  title: string;
  category?: string;
  suggestedShelfLifeDays?: number;
  suggestedLocationName?: string;
  suggestedUnit?: string;
  confidence?: number;
}

@Injectable()
export class LookupService {
  private readonly logger = new Logger(LookupService.name);

  constructor(
    private readonly catalogService: CatalogService,
    private readonly config: ConfigService,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async lookupBarcode(barcode: string): Promise<BarcodeLookupResponse> {
    if (!/^\d{6,14}$/.test(barcode)) throw new BadRequestException('Invalid barcode');

    const cached = await this.catalogService.findByBarcode(barcode);
    if (cached) {
      return {
        source: 'catalog',
        barcode,
        title: cached.title,
        brand: cached.brand,
        imageUrl: cached.imageUrl,
        suggestedLocation: cached.defaultLocation
          ? { id: String(cached.defaultLocation.id), name: cached.defaultLocation.name }
          : null,
        suggestedShelfLifeDays: cached.shelfLifeDays,
        suggestedUnit: cached.defaultUnit ?? DEFAULT_UNIT,
      };
    }

    const product = await this.fetchOpenFoodFacts(barcode);
    const title = product?.product_name_es || product?.product_name || product?.generic_name_es;

    if (!product || !title) {
      return {
        source: 'none',
        barcode,
        title: null,
        brand: null,
        imageUrl: null,
        suggestedLocation: null,
        suggestedShelfLifeDays: null,
        suggestedUnit: DEFAULT_UNIT,
      };
    }

    const brand = product.brands?.split(',')[0]?.trim() || null;
    const fullTitle = [title.trim(), product.quantity?.trim()].filter(Boolean).join(' ');
    const imageUrl = product.image_front_small_url ?? null;

    try {
      await this.catalogService.cacheExternal({ barcode, title: fullTitle, brand, imageUrl });
    } catch (error) {
      // A concurrent lookup may have cached it already; the response is still valid
      this.logger.warn(`Could not cache barcode ${barcode}: ${String(error)}`);
    }

    return {
      source: 'openfoodfacts',
      barcode,
      title: fullTitle,
      brand,
      imageUrl,
      suggestedLocation: null,
      suggestedShelfLifeDays: estimateShelfLifeDays(product.categories_tags),
      // Packaged product: counted in units, its size is already part of the title
      suggestedUnit: DEFAULT_UNIT,
    };
  }

  isImageLookupEnabled(): boolean {
    return !!this.config.get<string>('GEMINI_API_KEY');
  }

  async lookupImage({ imageBase64, mimeType }: ImageLookupDto): Promise<ImageLookupResponse> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new ServiceUnavailableException('Image lookup is not configured');

    const model = this.config.get<string>('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL;
    const [locations, frequent] = await Promise.all([
      this.locationRepository.find(),
      this.catalogService.getFrequent(30),
    ]);

    const prompt = [
      'Sos un asistente de inventario del hogar. Identificá el producto de la foto (alimento u otro producto doméstico).',
      'Respondé en español rioplatense, con un nombre corto y genérico (ej: "Carne picada", "Pechuga de pollo", "Tomates").',
      frequent.length
        ? `Si coincide con alguno de estos nombres ya usados, usá exactamente ese: ${frequent.map((p) => p.title).join(', ')}.`
        : '',
      locations.length
        ? `Sugerí la ubicación más adecuada entre: ${locations.map((l) => l.name).join(', ')}.`
        : '',
      'Estimá cuántos días dura en esa ubicación y tu confianza entre 0 y 1.',
      `Sugerí la unidad de medida (${UNITS.join(', ')}): productos envasados en "unit"; frescos o a granel (carne, verdura, queso) por peso ("g" o "kg") o volumen ("ml" o "l").`,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS * 2),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                category: { type: 'STRING' },
                suggestedShelfLifeDays: { type: 'INTEGER' },
                suggestedLocationName: { type: 'STRING' },
                suggestedUnit: { type: 'STRING', enum: [...UNITS] },
                confidence: { type: 'NUMBER' },
              },
              required: ['title', 'confidence'],
            },
          },
        }),
      },
    ).catch((error: unknown) => {
      this.logger.error(`Gemini request failed: ${String(error)}`);
      throw new BadGatewayException('Image lookup failed');
    });

    if (!response.ok) {
      this.logger.error(`Gemini responded ${response.status}: ${await response.text()}`);
      if (response.status === 429)
        throw new ServiceUnavailableException('Image lookup quota exceeded');
      throw new BadGatewayException('Image lookup failed');
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    let product: GeminiProduct;
    try {
      product = JSON.parse(text ?? '') as GeminiProduct;
    } catch {
      throw new BadGatewayException('Image lookup returned an invalid response');
    }

    const suggestedName = product.suggestedLocationName?.toLowerCase().trim();
    const location = suggestedName
      ? locations.find((l) => l.name.toLowerCase().trim() === suggestedName)
      : undefined;
    const shelfLife = Number(product.suggestedShelfLifeDays);

    return {
      title: product.title,
      category: product.category ?? null,
      suggestedLocation: location ? { id: String(location.id), name: location.name } : null,
      suggestedShelfLifeDays: shelfLife > 0 ? Math.round(shelfLife) : null,
      suggestedUnit: isUnit(product.suggestedUnit) ? product.suggestedUnit : DEFAULT_UNIT,
      confidence: Math.min(Math.max(Number(product.confidence) || 0, 0), 1),
    };
  }

  private async fetchOpenFoodFacts(barcode: string): Promise<OpenFoodFactsResponse['product']> {
    const contact = this.config.get<string>('OFF_CONTACT');
    const userAgent = `HouseholdInventory/0.1${contact ? ` (${contact})` : ''}`;

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`,
        {
          headers: { 'User-Agent': userAgent },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );
      if (!response.ok) return undefined;

      const data = (await response.json()) as OpenFoodFactsResponse;
      return data.status === 1 ? data.product : undefined;
    } catch (error) {
      this.logger.warn(`Open Food Facts lookup failed for ${barcode}: ${String(error)}`);
      return undefined;
    }
  }
}
