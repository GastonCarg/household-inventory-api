import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule as ThrottlerModuleConfig } from '@nestjs/throttler';
import { TypeOrmModule as NestTypeOrmModule } from '@nestjs/typeorm';

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
    synchronize: true,
    dropSchema: true,
    ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
    extra: config.get('NODE_ENV') === 'production' ? { ssl: { rejectUnauthorized: false } } : {},
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
