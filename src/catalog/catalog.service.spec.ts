import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductCatalog } from './catalog.entity';
import { CatalogService, normalizeTitle } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;

  const mockCatalogRepository = {
    findOneBy: jest.fn(),
    create: jest.fn((entry: object) => ({ ...entry })),
    merge: jest.fn((entry: object, changes: object) => Object.assign(entry, changes)),
    save: jest.fn((entry: object) => Promise.resolve(entry)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: getRepositoryToken(ProductCatalog), useValue: mockCatalogRepository },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  it('should normalize titles ignoring case, accents and spacing', () => {
    expect(normalizeTitle('  Jamón   Cocido ')).toBe('jamon cocido');
  });

  describe('recordUsage', () => {
    const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    it('should create a new entry with the shelf life and location', async () => {
      mockCatalogRepository.findOneBy.mockResolvedValue(null);

      await service.recordUsage([
        { title: 'Leche', barcode: '7790080000000', expireDate: inTenDays, location: { id: '1' } },
      ]);

      expect(mockCatalogRepository.findOneBy).toHaveBeenCalledWith({ barcode: '7790080000000' });
      expect(mockCatalogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Leche',
          barcode: '7790080000000',
          defaultLocation: { id: '1' },
          shelfLifeDays: 10,
          defaultUnit: 'unit',
          timesUsed: 1,
        }),
      );
    });

    it('should increment an existing entry', async () => {
      mockCatalogRepository.findOneBy.mockResolvedValue({
        title: 'Carne picada',
        timesUsed: 4,
        shelfLifeDays: 90,
      });

      await service.recordUsage([
        { title: 'Carne picada', expireDate: inTenDays, location: { id: '2' }, unit: 'kg' },
      ]);

      expect(mockCatalogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          timesUsed: 5,
          shelfLifeDays: 10,
          defaultLocation: { id: '2' },
          defaultUnit: 'kg',
        }),
      );
    });

    it('should keep the previous shelf life when the item is already expired', async () => {
      mockCatalogRepository.findOneBy.mockResolvedValue({
        title: 'Pan',
        timesUsed: 1,
        shelfLifeDays: 5,
      });

      await service.recordUsage([
        { title: 'Pan', expireDate: '2000-01-01T00:00:00.000Z', location: { id: '3' } },
      ]);

      expect(mockCatalogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ shelfLifeDays: 5, timesUsed: 2 }),
      );
    });
  });
});
