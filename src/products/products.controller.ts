import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AddItemDto } from './products.dto';
import { Item } from './products.entity';
import { ProductsService } from './products.service';

@UseGuards(ThrottlerGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getItems(@Query('page') page: number, @Query('limit') limit: number) {
    return this.productsService.getItems(page, limit);
  }

  @Post()
  addItem(@Body() addItemBody: AddItemDto): Promise<Item> {
    return this.productsService.addItem(addItemBody);
  }

  @Get('/summary')
  getExpirationSummary() {
    return this.productsService.getExpirationSummary();
  }

  @Delete('/:id')
  removeItem(@Param('id') id: string) {
    return this.productsService.removeItem(id);
  }

  @Get('/:id')
  getItemById(@Param('id') id: string) {
    return this.productsService.getItemById(id);
  }
}
