import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Item } from './products.entity';
import { LocationsService } from '../locations/locations.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  const mockItemRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockLocationsService = {};

  beforeEach(async () => {
    jest.clearAllMocks();
    mockItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Item), useValue: mockItemRepository },
        { provide: LocationsService, useValue: mockLocationsService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
