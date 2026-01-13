import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();
const databaseUrl = configService.get('DATABASE_URL');

export default new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    entities: ['src/modules/**/*.entity.{ts,js}'],
    migrations: ['src/database/migrations/*.ts'],
    migrationsTableName: 'migrations'
}); 