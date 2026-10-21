import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Item } from './products.entity';
import { LocationsService } from '../locations/locations.service';
import { CatalogService } from '../catalog/catalog.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  const mockItemRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findAndCount: jest.fn(),
  };

  const mockLocationsService = {};

  const mockCatalogService = {
    recordUsage: jest.fn(),
  };

  const mockTransactionRepository = {
    create: jest.fn((item: object) => item),
    save: jest.fn((items: object[]) => Promise.resolve(items)),
  };

  const mockDataSource = {
    transaction: jest.fn((work: (manager: unknown) => unknown) =>
      work({ getRepository: () => mockTransactionRepository }),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Item), useValue: mockItemRepository },
        { provide: LocationsService, useValue: mockLocationsService },
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getItems', () => {
    it('returns the page sorted by expiration date, soonest first', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      mockItemRepository.findAndCount.mockResolvedValue([items, 25]);

      const result = await service.getItems(2, 12);

      expect(mockItemRepository.findAndCount).toHaveBeenCalledWith({
        take: 12,
        skip: 12,
        relations: ['location'],
        order: { expireDate: 'ASC', id: 'ASC' },
      });
      expect(result).toEqual({ data: items, total: 25, page: 2, lastPage: 3, next: 3 });
    });
  });

  describe('addItems', () => {
    const items = [
      {
        title: 'Leche',
        barcode: '7790080000000',
        expireDate: '2030-01-10T00:00:00.000Z',
        quantity: 2,
        location: { id: '1', name: 'Heladera' },
      },
      {
        title: 'Carne picada',
        expireDate: '2030-01-03T00:00:00.000Z',
        quantity: 1,
        location: { id: '2', name: 'Freezer' },
      },
    ];

    it('should save all items in a single transaction', async () => {
      const result = await service.addItems(items);

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockTransactionRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ title: 'Leche', location: { id: '1' } });
    });

    it('should record the items in the catalog', async () => {
      await service.addItems(items);

      expect(mockCatalogService.recordUsage).toHaveBeenCalledWith(items);
    });

    it('should not fail when the catalog update fails', async () => {
      mockCatalogService.recordUsage.mockRejectedValueOnce(new Error('db down'));

      await expect(service.addItems(items)).resolves.toHaveLength(2);
    });

    it('should reject an empty list', async () => {
      await expect(service.addItems([])).rejects.toThrow();
    });
  });

  describe('getExpirationSummary', () => {
    it('should not count expired products as expiring soon', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({
        expired: '6',
        expiringsoon: '0',
        total: '6',
      });

      const result = await service.getExpirationSummary();

      expect(result.expired).toBe(6);
      expect(result.expiringSoon).toBe(0);
      expect(result.total).toBe(6);
    });

    it('should count only non-expired products expiring within 3 days as expiring soon', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({
        expired: '2',
        expiringsoon: '3',
        total: '10',
      });

      const result = await service.getExpirationSummary();

      expect(result.expired).toBe(2);
      expect(result.expiringSoon).toBe(3);
      expect(result.total).toBe(10);
    });

    it('should use a lower bound of today in the expiringSoon SQL condition', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({
        expired: '0',
        expiringsoon: '0',
        total: '0',
      });

      await service.getExpirationSummary();

      const selectCall = mockQueryBuilder.select.mock.calls[0][0] as string[];
      const expiringSoonCondition = selectCall.find((s) =>
        s.includes('expiringSoon'),
      );

      expect(expiringSoonCondition).toContain(':today');
      expect(expiringSoonCondition).toContain(':threeDaysLater');
      expect(expiringSoonCondition).toMatch(/>=\s*:today/);
    });
  });
});
