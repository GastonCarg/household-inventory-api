import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddItemDto } from './products.dto';
import { Item } from './products.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Item)
    private productRepository: Repository<Item>,
  ) {}

  async getItems(): Promise<Item[]> {
    const products = await this.productRepository.find();
    if (!products) throw new NotFoundException();

    return products;
  }

  async addItem(addItemBody: AddItemDto): Promise<Item> {
    const { title, expireDate, quantity, location } = addItemBody;

    if (!title || !expireDate || !quantity || !location)
      throw new BadRequestException('Missing body parameters');

    const response = this.productRepository.create(addItemBody);
    return this.productRepository.save(response);
  }

  async removeItem(id: string): Promise<{ message: string; status: number }> {
    if (!id)
      throw new BadRequestException({ message: 'Invalid ID', status: 400 });

    const item = await this.productRepository.findOneBy({ id });
    if (!item)
      throw new NotFoundException({ message: 'Item not found', status: 404 });

    await this.productRepository.softDelete({ id });

    return { message: 'Item deleted successfully', status: 200 };
  }

  async getItemById(id: string): Promise<Item> {
    if (!id)
      throw new BadRequestException({ message: 'Invalid ID', status: 400 });

    const item = await this.productRepository.findOneBy({ id });
    if (!item)
      throw new NotFoundException({ message: 'Item not found', status: 404 });

    return item;
  }
}
