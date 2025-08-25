import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule as ThrottlerModuleConfig } from '@nestjs/throttler';
import { TypeOrmModule as NestTypeOrmModule } from '@nestjs/typeorm';
import { IS_PRODUCTION } from './constant';

export const TypeOrmAsyncModule = NestTypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST')!,
    port: Number(config.get<number>('DB_PORT')),
    username: config.get<string>('DB_USERNAME')!,
    password: config.get<string>('DB_PASSWORD')!,
    database: config.get<string>('DB_DATABASE')!,
    autoLoadEntities: true,
    synchronize: IS_PRODUCTION ? false : true,
    ssl: true,
    extra: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
  }),
});

export const ThrottlerModule = ThrottlerModuleConfig.forRoot({
  throttlers: [
    {
      ttl: 60000,
      limit: 30,
    },
  ],
});
