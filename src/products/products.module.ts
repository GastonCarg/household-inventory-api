import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { Location } from '../locations/locations.entity';
import { LocationsService } from '../locations/locations.service';
import { ProductsController } from './products.controller';
import { Item } from './products.entity';
import { ProductsService } from './products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Item, Location]), CatalogModule],
  controllers: [ProductsController],
  providers: [ProductsService, LocationsService],
})
export class ProductsModule {}
