import { DataSource } from 'typeorm';
import { Department } from '../../entities/department.entity';

export async function seedDepartments(dataSource: DataSource) {
  const departmentRepository = dataSource.getRepository(Department);

  // Check if departments already exist
  const existingCount = await departmentRepository.count();
  if (existingCount > 0) {
    console.log('Department data already exists, skipping seeder...');
    return;
  }

  const departments = [
    {
      name: 'Keuangan dan Akuntansi',
      code: 'FIN',
      is_active: true,
      approval_layers: 3,
    },
    {
      name: 'Sumber Daya Manusia',
      code: 'HRD',
      is_active: true,
      approval_layers: 2,
    },
    {
      name: 'Teknologi Informasi',
      code: 'IT',
      is_active: true,
      approval_layers: 2,
    },
    {
      name: 'Pengadaan dan Logistik',
      code: 'LOG',
      is_active: true,
      approval_layers: 3,
    },
    {
      name: 'Produksi Kabel',
      code: 'PROD',
      is_active: true,
      approval_layers: 2,
    },
    {
      name: 'Quality Control',
      code: 'QC',
      is_active: true,
      approval_layers: 2,
    },
    {
      name: 'Pemasaran dan Penjualan',
      code: 'SALES',
      is_active: true,
      approval_layers: 2,
    },
    {
      name: 'Maintenance dan Engineering',
      code: 'MAINT',
      is_active: true,
      approval_layers: 2,
    },
    {
      name: 'General Affairs',
      code: 'GA',
      is_active: true,
      approval_layers: 1,
    },
    {
      name: 'Research and Development',
      code: 'RND',
      is_active: true,
      approval_layers: 2,
    },
  ];

  const createdDepartments = departmentRepository.create(departments);
  await departmentRepository.save(createdDepartments);

  console.log(`✅ Successfully seeded ${departments.length} departments`);
}
