import dataSource from './data-source';
import { readdirSync } from 'fs';
import { join } from 'path';

async function runMigrations() {
  try {
    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    const migrationArg = process.argv[2];

    if (migrationArg) {
      await runSpecificMigration(migrationArg);
    } else {
      console.log('Please specify migration name as argument');
      console.log('Example: npm run migration:run AddDepartmentIdToUsers');
      process.exit(1);
    }

    await dataSource.destroy();
    console.log('Data Source has been destroyed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration execution:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

async function runSpecificMigration(migrationArg: string) {
  const migrationsDir = join(__dirname, '../../migrations');
  const migrationFiles = readdirSync(migrationsDir).filter((file) =>
    file.endsWith('.ts'),
  );

  const targetFile = migrationFiles.find(
    (file) =>
      file.includes(migrationArg) || file.replace('.ts', '') === migrationArg,
  );

  if (!targetFile) {
    const availableFiles = migrationFiles
      .map((f) => f.replace('.ts', ''))
      .join(', ');
    throw new Error(
      `Migration '${migrationArg}' not found. Available: ${availableFiles}`,
    );
  }

  console.log(`🎯 Running migration: ${targetFile}`);

  const migrationPath = join(__dirname, '../../migrations', targetFile);
  const migrationModule = await import(migrationPath);

  const MigrationClass =
    migrationModule.default || Object.values(migrationModule)[0];

  if (!MigrationClass) {
    throw new Error(`No migration class found in ${targetFile}`);
  }

  const queryRunner = dataSource.createQueryRunner();
  try {
    const migrationInstance = new (MigrationClass as any)();
    await migrationInstance.up(queryRunner);
    console.log(`✅ Migration ${targetFile} completed successfully!`);
  } finally {
    await queryRunner.release();
  }
}

runMigrations();
