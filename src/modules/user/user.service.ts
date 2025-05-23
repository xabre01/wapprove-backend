import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Account } from '../../entities';
import { UserRole } from '../../common/enums';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto';
import { PaginationMeta } from '../../common/interfaces';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email sudah digunakan');
    }

    // Create user
    const user = this.userRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      phone_number: createUserDto.phone_number,
      department_id: createUserDto.department_id,
      role: (createUserDto.role as UserRole) || UserRole.STAFF,
      is_active: createUserDto.is_active ?? true,
    });

    const savedUser = await this.userRepository.save(user);

    return savedUser;
  }

  async findAllWithPagination(queryDto: QueryUserDto) {
    const {
      query,
      is_active,
      exclude_account_id,
      page = 1,
      per_page = 10,
      sort_by = 'name',
      sort_order = 'asc',
    } = queryDto;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department');

    // Apply search filter
    if (query) {
      queryBuilder.where(
        '(user.name ILIKE :query OR user.email ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    // Apply is_active filter only if parameter is provided
    if (is_active !== undefined && is_active !== null && is_active !== '') {
      const isActiveBoolean = is_active === 'true';
      queryBuilder.andWhere('user.is_active = :is_active', {
        is_active: isActiveBoolean,
      });
    }

    // Apply exclude_account_id filter
    if (exclude_account_id) {
      queryBuilder
        .leftJoin('user.account', 'account')
        .andWhere('account.id != :exclude_account_id', { exclude_account_id });
    }

    // Apply sorting
    const sortDirection = sort_order.toUpperCase() as 'ASC' | 'DESC';
    queryBuilder.orderBy(`user.${sort_by}`, sortDirection);

    // Apply pagination
    const skip = (page - 1) * per_page;
    queryBuilder.skip(skip).take(per_page);

    // Get results and count
    const [users, total] = await queryBuilder.getManyAndCount();

    // Calculate pagination meta
    const total_pages = Math.ceil(total / per_page);
    const meta: PaginationMeta = {
      page,
      per_page,
      total,
      total_pages,
    };

    return { users, meta };
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
      relations: ['department'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['account', 'department'],
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check if new email conflicts with existing user
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email sudah digunakan');
      }
    }

    // Update user data using repository.update() for reliability
    const updateData: Partial<User> = {};

    if (updateUserDto.name !== undefined) updateData.name = updateUserDto.name;
    if (updateUserDto.email !== undefined)
      updateData.email = updateUserDto.email;
    if (updateUserDto.phone_number !== undefined)
      updateData.phone_number = updateUserDto.phone_number;
    if (updateUserDto.department_id !== undefined)
      updateData.department_id = updateUserDto.department_id;
    if (updateUserDto.role !== undefined)
      updateData.role = updateUserDto.role as UserRole;
    if (updateUserDto.is_active !== undefined)
      updateData.is_active = updateUserDto.is_active;

    // Use repository.update() for direct database update
    await this.userRepository.update(id, updateData);

    // Re-fetch user with relations to ensure fresh data
    const finalUser = await this.userRepository.findOne({
      where: { id },
      relations: ['account', 'department'],
    });

    return finalUser;
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);

    // Remove account first due to foreign key constraint
    await this.accountRepository.delete({ user_id: id });

    // Remove user
    await this.userRepository.remove(user);
  }

  async toggleStatus(id: number): Promise<User> {
    const user = await this.findOne(id);
    user.is_active = !user.is_active;
    return await this.userRepository.save(user);
  }
}
