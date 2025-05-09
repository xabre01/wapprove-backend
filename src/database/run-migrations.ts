import dataSource from './data-source';

async function runMigrations() {
  try {
    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    await dataSource.runMigrations();
    console.log('Migrations have been run successfully!');

    await dataSource.destroy();
    console.log('Data Source has been destroyed.');

    process.exit(0);
  } catch (error) {
    console.error('Error during migration execution:', error);
    process.exit(1);
  }
}

runMigrations();
