import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { join } from 'path';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      url: this.configService.get<string>('database.url'),
      entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
      synchronize: this.configService.get<boolean>('database.synchronize'),
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }
}
