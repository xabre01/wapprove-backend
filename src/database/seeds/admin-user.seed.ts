import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User } from '../../entities/user.entity';
import { Account } from '../../entities/account.entity';
import { UserRole } from '../../common/enums';

async function createAdminUser() {
  try {
    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    const userRepository = dataSource.getRepository(User);
    const accountRepository = dataSource.getRepository(Account);

    // Check if admin already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@wapprove.com' },
    });

    if (existingAdmin) {
      console.log('Admin user already exists, skipping creation');
      await dataSource.destroy();
      return;
    }

    // Create admin user
    const adminUser = new User();
    adminUser.name = 'Admin';
    adminUser.email = 'admin@wapprove.com';
    adminUser.role = UserRole.ADMIN;
    adminUser.is_active = true;
    adminUser.phone_number = '081234567890';

    const savedUser = await userRepository.save(adminUser);
    console.log('Admin user created:', savedUser);

    // Create admin account
    const adminAccount = new Account();
    adminAccount.user_id = savedUser.id;
    adminAccount.password = await bcrypt.hash('admin123', 10);
    adminAccount.is_locked = false;

    const savedAccount = await accountRepository.save(adminAccount);
    console.log('Admin account created:', savedAccount);

    await dataSource.destroy();
    console.log('Data Source has been destroyed.');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser();
