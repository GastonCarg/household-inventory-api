import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IS_PRODUCTION } from './helpers/constant';
import { ThrottlerModule, TypeOrmAsyncModule } from './helpers/modules';
import { LocationsModule } from './locations/locations.module';
import { ProductsModule } from './products/products.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: IS_PRODUCTION ? '.env.production' : '.env',
    }),
    TypeOrmAsyncModule,
    ProductsModule,
    ThrottlerModule,
    LocationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
