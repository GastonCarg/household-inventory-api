import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatalogModule } from './catalog/catalog.module';
import { ThrottlerModule, TypeOrmAsyncModule } from './helpers/modules';
import { LocationsModule } from './locations/locations.module';
import { LookupModule } from './lookup/lookup.module';
import { ProductsModule } from './products/products.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmAsyncModule,
    ProductsModule,
    ThrottlerModule,
    LocationsModule,
    CatalogModule,
    LookupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
