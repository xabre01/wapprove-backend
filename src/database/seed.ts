import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { entities } from '../entities';
import { seedDepartments } from './seeders/department.seeder';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ||
    'postgresql://wapprovedb_owner:npg_2UqdLNboB7eu@ep-blue-voice-a185faca-pooler.ap-southeast-1.aws.neon.tech/wapprovedb?sslmode=require',
  entities,
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runSeeders() {
  try {
    console.log('🌱 Starting database seeding...');
    await AppDataSource.initialize();
    console.log('📝 Database connection established');

    // Run department seeder
    await seedDepartments(AppDataSource);

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

runSeeders();
