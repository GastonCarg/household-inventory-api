import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { ProductCatalog } from './catalog.entity';
import { CatalogService } from './catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductCatalog])],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
