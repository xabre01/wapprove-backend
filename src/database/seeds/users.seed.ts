import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User } from '../../entities/user.entity';
import { Account } from '../../entities/account.entity';
import { UserRole } from '../../common/enums';

async function seedUsers() {
  try {
    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    const userRepository = dataSource.getRepository(User);
    const accountRepository = dataSource.getRepository(Account);

    // Check if users already exist
    // const existingUsers = await userRepository.count();
    // if (existingUsers > 0) {
    //   console.log('Users already exist, skipping seeding');
    //   await dataSource.destroy();
    //   return;
    // }

    const usersData = [
      {
        name: 'John Manager',
        email: 'manager@jembocable.com',
        phone_number: '081234567891',
        department_id: 1, // Keuangan dan Akuntansi
        role: UserRole.MANAGER,
        password: 'manager123',
      },
      {
        name: 'Sarah Director',
        email: 'director@jembocable.com',
        phone_number: '081234567892',
        department_id: 2, // Sumber Daya Manusia
        role: UserRole.DIRECTOR,
        password: 'director123',
      },
      {
        name: 'Michael Purchasing',
        email: 'purchasing@jembocable.com',
        phone_number: '081234567893',
        department_id: 4, // Pengadaan dan Logistik
        role: UserRole.PURCHASING,
        password: 'purchasing123',
      },
      {
        name: 'Lisa Staff',
        email: 'lisa.staff@jembocable.com',
        phone_number: '081234567894',
        department_id: 3, // Teknologi Informasi
        role: UserRole.STAFF,
        password: 'staff123',
      },
      {
        name: 'Robert Staff',
        email: 'robert.staff@jembocable.com',
        phone_number: '081234567895',
        department_id: 5, // Produksi Kabel
        role: UserRole.STAFF,
        password: 'staff123',
      },
      {
        name: 'Anna Staff',
        email: 'anna.staff@jembocable.com',
        phone_number: '081234567896',
        department_id: 6, // Quality Control
        role: UserRole.STAFF,
        password: 'staff123',
      },
      {
        name: 'David Manager',
        email: 'david.manager@jembocable.com',
        phone_number: '081234567897',
        department_id: 7, // Pemasaran dan Penjualan
        role: UserRole.MANAGER,
        password: 'manager123',
      },
      {
        name: 'Emily Staff',
        email: 'emily.staff@jembocable.com',
        phone_number: '081234567898',
        department_id: 8, // Maintenance dan Engineering
        role: UserRole.STAFF,
        password: 'staff123',
      },
      // 10 additional users
      {
        name: 'James Finance',
        email: 'james.finance@jembocable.com',
        phone_number: '081234567899',
        department_id: 1, // Keuangan dan Akuntansi
        role: UserRole.STAFF,
        password: 'staff123',
      },
      {
        name: 'Maria HR',
        email: 'maria.hr@jembocable.com',
        phone_number: '081234567900',
        department_id: 2, // Sumber Daya Manusia
        role: UserRole.STAFF,
        password: 'staff123',
      },
      {
        name: 'Thomas IT',
        email: 'thomas.it@jembocable.com',
        phone_number: '081234567901',
        department_id: 3, // Teknologi Informasi
        role: UserRole.STAFF,
        password: 'staff123',
      },
      {
        name: 'Patricia Logistics',
        email: 'patricia.logistics@jembocable.com',
        phone_number: '081234567902',
        department_id: 4, // Pengadaan dan Logistik
        role: UserRole.STAFF,
        password: 'staff123',
      },
      {
        name: 'Kevin Production',
        email: 'kevin.production@jembocable.com',
        phone_number: '081234567903',
        department_id: 5, // Produksi Kabel
        role: UserRole.MANAGER,
        password: 'manager123',
      },
      {
        name: 'Jennifer QC',
        email: 'jennifer.qc@jembocable.com',
        phone_number: '081234567904',
        department_id: 6, // Quality Control
        role: UserRole.STAFF,
        password: 'staff123',
      },
      {
        name: 'Ryan Sales',
        email: 'ryan.sales@jembocable.com',
        phone_number: '081234567905',
        department_id: 7, // Pemasaran dan Penjualan
        role: UserRole.STAFF,
        password: 'staff123',
      },
      {
        name: 'Michelle Engineering',
        email: 'michelle.engineering@jembocable.com',
        phone_number: '081234567906',
        department_id: 8, // Maintenance dan Engineering
        role: UserRole.STAFF,
        password: 'staff123',
      },
      {
        name: 'Andrew GA',
        email: 'andrew.ga@jembocable.com',
        phone_number: '081234567907',
        department_id: 9, // General Affairs
        role: UserRole.STAFF,
        password: 'staff123',
      },
      {
        name: 'Rebecca RnD',
        email: 'rebecca.rnd@jembocable.com',
        phone_number: '081234567908',
        department_id: 10, // Research and Development
        role: UserRole.STAFF,
        password: 'staff123',
      },
    ];

    for (const userData of usersData) {
      // Create user
      const user = userRepository.create({
        name: userData.name,
        email: userData.email,
        phone_number: userData.phone_number,
        department_id: userData.department_id,
        role: userData.role,
        is_active: true,
      });

      const savedUser = await userRepository.save(user);

      // Create account
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const account = accountRepository.create({
        user_id: savedUser.id,
        password: hashedPassword,
      });

      await accountRepository.save(account);
      console.log(
        `User ${userData.name} created with department_id ${userData.department_id}`,
      );
    }

    console.log('Users seeding completed');
    await dataSource.destroy();
  } catch (error) {
    console.error('Error seeding users:', error);
  }
}

if (require.main === module) {
  seedUsers();
}

export default seedUsers;
