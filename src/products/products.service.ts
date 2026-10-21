import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CatalogService } from '../catalog/catalog.service';
import { LocationsService } from '../locations/locations.service';
import { AddItemDto, ResponseProductsDto, UpdateItemDto } from './products.dto';
import { Item } from './products.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Item)
    private productRepository: Repository<Item>,
    private readonly locationsService: LocationsService,
    private readonly catalogService: CatalogService,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async getItems(page: number = 1, limit: number = 10): Promise<ResponseProductsDto> {
    const [products, total] = await this.productRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['location'],
      // Soonest to expire first; id breaks ties so pages don't overlap or skip items
      order: { expireDate: 'ASC', id: 'ASC' },
    });

    if (!products) throw new NotFoundException();

    return {
      data: products,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      next: page < Math.ceil(total / limit) ? page + 1 : null,
    };
  }

  async addItem(addItemBody: AddItemDto): Promise<Item> {
    const { title, expireDate, quantity, location } = addItemBody;

    if (!title || !expireDate || !quantity || !location) throw new BadRequestException();

    const response = this.productRepository.create({
      ...addItemBody,
      location: { id: location.id },
    });

    if (!response) throw new InternalServerErrorException();
    const saved = await this.productRepository.save(response);
    await this.recordCatalogUsage([addItemBody]);
    return saved;
  }

  async addItems(items: AddItemDto[]): Promise<Item[]> {
    if (!items?.length) throw new BadRequestException();

    const saved = await this.dataSource.transaction((manager) => {
      const repository = manager.getRepository(Item);
      const entities = items.map((item) =>
        repository.create({ ...item, location: { id: item.location.id } }),
      );
      return repository.save(entities);
    });

    await this.recordCatalogUsage(items);
    return saved;
  }

  // The catalog only powers suggestions, so a failure here must not fail the request
  private async recordCatalogUsage(items: AddItemDto[]): Promise<void> {
    try {
      await this.catalogService.recordUsage(items);
    } catch (error) {
      this.logger.warn(`Could not update product catalog: ${String(error)}`);
    }
  }

  async removeItem(id: string): Promise<{ message: string; status: number }> {
    if (!id) throw new BadRequestException();

    const item = await this.productRepository.findOneBy({ id });
    if (!item) throw new NotFoundException();

    await this.productRepository.softDelete({ id });

    return { message: 'Ok', status: 200 };
  }

  async getItemById(id: string): Promise<Item> {
    if (!id) throw new BadRequestException();

    const item = await this.productRepository.findOne({
      where: { id },
      relations: ['location'],
    });
    if (!item) throw new NotFoundException();
    return item;
  }

  async updateItem(id: string, updateItemBody: UpdateItemDto): Promise<Item> {
    if (!id) throw new BadRequestException();

    const item = await this.productRepository.findOneBy({ id });
    if (!item) throw new NotFoundException();

    const updated = this.productRepository.merge(item, {
      ...updateItemBody,
      ...(updateItemBody.location && { location: { id: updateItemBody.location.id } }),
    });

    return this.productRepository.save(updated);
  }

  async getExpirationSummary(): Promise<{ expiringSoon: number; expired: number; total: number }> {
    const today = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);

    today.toISOString();
    threeDaysLater.toISOString();

    type ExpirationSummaryResult = {
      expired: string | null;
      expiringsoon: string | null;
      total: string | null;
    };

    const result = (await this.productRepository
      .createQueryBuilder('item')
      .select([
        `SUM(CASE WHEN item.expireDate < :today THEN 1 ELSE 0 END) AS expired`,
        `SUM(CASE WHEN item.expireDate >= :today AND item.expireDate <= :threeDaysLater THEN 1 ELSE 0 END) AS expiringSoon`,
        `COUNT(*) as total`,
      ])
      .setParameters({ today, threeDaysLater })
      .getRawOne()) as ExpirationSummaryResult;

    return {
      expired: Number(result?.expired ?? 0),
      expiringSoon: Number(result?.expiringsoon ?? 0),
      total: Number(result?.total ?? 0),
    };
  }
}
