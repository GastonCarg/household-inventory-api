import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { Location } from '../locations/locations.entity';
import { LookupController } from './lookup.controller';
import { LookupService } from './lookup.service';

@Module({
  imports: [TypeOrmModule.forFeature([Location]), CatalogModule],
  controllers: [LookupController],
  providers: [LookupService],
})
export class LookupModule {}
