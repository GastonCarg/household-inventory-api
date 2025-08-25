import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LocationsService } from 'src/locations/locations.service';
import { Repository } from 'typeorm';
import { AddItemDto, ResponseProductsDto } from './products.dto';
import { Item } from './products.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Item)
    private productRepository: Repository<Item>,
    private readonly locationsService: LocationsService,
  ) {}

  async getItems(page: number = 1, limit: number = 10): Promise<ResponseProductsDto> {
    const [products, total] = await this.productRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['location'],
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

    const response = this.productRepository.create({ ...addItemBody, location: { id: location } });

    if (!response) throw new InternalServerErrorException();
    return this.productRepository.save(response);
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
        `SUM(CASE WHEN item.expireDate <= :threeDaysLater THEN 1 ELSE 0 END) AS expiringSoon`,
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
