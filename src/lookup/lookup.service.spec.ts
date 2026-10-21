import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CatalogService } from '../catalog/catalog.service';
import { Location } from '../locations/locations.entity';
import { LookupService } from './lookup.service';

describe('LookupService', () => {
  let service: LookupService;
  let env: Record<string, string | undefined>;

  const mockCatalogService = {
    findByBarcode: jest.fn(),
    cacheExternal: jest.fn(),
    getFrequent: jest.fn(),
  };

  const mockLocationRepository = {
    find: jest.fn(),
  };

  const fetchMock = jest.fn();

  const jsonResponse = (body: unknown, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    env = {};
    global.fetch = fetchMock as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LookupService,
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
        { provide: getRepositoryToken(Location), useValue: mockLocationRepository },
      ],
    }).compile();

    service = module.get<LookupService>(LookupService);
  });

  describe('lookupBarcode', () => {
    it('should reject invalid barcodes', async () => {
      await expect(service.lookupBarcode('abc')).rejects.toThrow(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return the catalog entry without calling Open Food Facts', async () => {
      mockCatalogService.findByBarcode.mockResolvedValue({
        title: 'Leche entera 1L',
        brand: 'La Serenísima',
        imageUrl: null,
        defaultLocation: { id: 1, name: 'Heladera' },
        shelfLifeDays: 8,
        defaultUnit: 'l',
      });

      const result = await service.lookupBarcode('7790742000000');

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        source: 'catalog',
        title: 'Leche entera 1L',
        suggestedLocation: { id: '1', name: 'Heladera' },
        suggestedShelfLifeDays: 8,
        suggestedUnit: 'l',
      });
    });

    it('should fetch Open Food Facts and cache the product when not in the catalog', async () => {
      mockCatalogService.findByBarcode.mockResolvedValue(null);
      fetchMock.mockResolvedValue(
        jsonResponse({
          status: 1,
          product: {
            product_name: 'Yogur bebible',
            brands: 'Ilolay, Otra',
            quantity: '1 L',
            categories_tags: ['en:dairies', 'en:yogurts'],
          },
        }),
      );

      const result = await service.lookupBarcode('7790742000000');

      expect(result).toMatchObject({
        source: 'openfoodfacts',
        title: 'Yogur bebible 1 L',
        brand: 'Ilolay',
        suggestedShelfLifeDays: 20,
        suggestedUnit: 'unit',
      });
      expect(mockCatalogService.cacheExternal).toHaveBeenCalledWith(
        expect.objectContaining({ barcode: '7790742000000', title: 'Yogur bebible 1 L' }),
      );
    });

    it('should return source none when the product is unknown', async () => {
      mockCatalogService.findByBarcode.mockResolvedValue(null);
      fetchMock.mockResolvedValue(jsonResponse({ status: 0 }));

      const result = await service.lookupBarcode('7790742000000');

      expect(result.source).toBe('none');
      expect(mockCatalogService.cacheExternal).not.toHaveBeenCalled();
    });

    it('should return source none when Open Food Facts is unreachable', async () => {
      mockCatalogService.findByBarcode.mockResolvedValue(null);
      fetchMock.mockRejectedValue(new Error('timeout'));

      const result = await service.lookupBarcode('7790742000000');

      expect(result.source).toBe('none');
    });
  });

  describe('lookupImage', () => {
    const body = { imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg' };

    it('should fail with 503 when Gemini is not configured', async () => {
      await expect(service.lookupImage(body)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should map the Gemini answer to one of the user locations', async () => {
      env.GEMINI_API_KEY = 'key';
      mockLocationRepository.find.mockResolvedValue([
        { id: 1, name: 'Heladera' },
        { id: 2, name: 'Freezer' },
      ]);
      mockCatalogService.getFrequent.mockResolvedValue([{ title: 'Carne picada' }]);
      fetchMock.mockResolvedValue(
        jsonResponse({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: 'Carne picada',
                      category: 'carne',
                      suggestedShelfLifeDays: 90,
                      suggestedLocationName: 'freezer',
                      suggestedUnit: 'kg',
                      confidence: 0.9,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      );

      const result = await service.lookupImage(body);

      expect(result).toEqual({
        title: 'Carne picada',
        category: 'carne',
        suggestedLocation: { id: '2', name: 'Freezer' },
        suggestedShelfLifeDays: 90,
        suggestedUnit: 'kg',
        confidence: 0.9,
      });
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('gemini-2.5-flash:generateContent');
      expect(String(init.body)).toContain('Carne picada');
    });

    it('should fall back to units when Gemini suggests an unknown unit', async () => {
      env.GEMINI_API_KEY = 'key';
      mockLocationRepository.find.mockResolvedValue([]);
      mockCatalogService.getFrequent.mockResolvedValue([]);
      fetchMock.mockResolvedValue(
        jsonResponse({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: 'Pan',
                      suggestedUnit: 'docena',
                      confidence: 0.8,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      );

      const result = await service.lookupImage(body);

      expect(result.suggestedUnit).toBe('unit');
    });

    it('should fail with 503 when the free tier quota is exceeded', async () => {
      env.GEMINI_API_KEY = 'key';
      mockLocationRepository.find.mockResolvedValue([]);
      mockCatalogService.getFrequent.mockResolvedValue([]);
      fetchMock.mockResolvedValue(jsonResponse({ error: 'quota' }, 429));

      await expect(service.lookupImage(body)).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
