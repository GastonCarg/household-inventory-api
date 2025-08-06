import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LocationsService } from 'src/locations/locations.service';
import { Repository } from 'typeorm';
import { AddItemDto } from './products.dto';
import { Item } from './products.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Item)
    private productRepository: Repository<Item>,
    private readonly locationsService: LocationsService,
  ) {}

  async getItems(): Promise<Item[]> {
    const products = await this.productRepository.find();
    if (!products) throw new NotFoundException();

    return products;
  }

  async addItem(addItemBody: AddItemDto): Promise<Item> {
    const { title, expireDate, quantity, location } = addItemBody;

    if (!title || !expireDate || !quantity || !location) throw new BadRequestException();

    const response = this.productRepository.create(addItemBody);

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

    const item = await this.productRepository.findOneBy({ id });
    if (!item) throw new NotFoundException();

    const location = await this.locationsService.getLocationById(item.location);

    if (!location) throw new NotFoundException();
    const modifiedItem = { ...item, location: location.name };

    return modifiedItem;
  }
}
