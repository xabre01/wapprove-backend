import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Account, User } from '../../entities';
import {
  CreateAccountDto,
  QueryAccountDto,
  UpdateLockStatusDto,
  UpdatePasswordDto,
} from './dto';
import { PaginationMeta } from '../../common/interfaces';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: createAccountDto.user_id },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Check if account already exists for this user
    const existingAccount = await this.accountRepository.findOne({
      where: { user_id: createAccountDto.user_id },
    });

    if (existingAccount) {
      throw new ConflictException('Account sudah ada untuk user ini');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createAccountDto.password, 10);

    // Create account
    const account = this.accountRepository.create({
      user_id: createAccountDto.user_id,
      password: hashedPassword,
      is_locked: false,
    });

    const savedAccount = await this.accountRepository.save(account);

    return savedAccount;
  }

  async findAllWithPagination(queryDto: QueryAccountDto) {
    const {
      query,
      is_locked,
      page = 1,
      per_page = 10,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = queryDto;

    const queryBuilder = this.accountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.user', 'user')
      .leftJoinAndSelect('user.department', 'department');

    // Apply search filter
    if (query) {
      queryBuilder.where(
        '(user.name ILIKE :query OR user.email ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    // Apply is_locked filter
    if (is_locked !== undefined && is_locked !== null) {
      queryBuilder.andWhere('account.is_locked = :is_locked', {
        is_locked,
      });
    }

    // Apply sorting
    const sortDirection = sort_order.toUpperCase() as 'ASC' | 'DESC';
    if (sort_by === 'user_id') {
      queryBuilder.orderBy('user.name', sortDirection);
    } else {
      queryBuilder.orderBy(`account.${sort_by}`, sortDirection);
    }

    // Apply pagination
    const skip = (page - 1) * per_page;
    queryBuilder.skip(skip).take(per_page);

    // Get results and count
    const [accounts, total] = await queryBuilder.getManyAndCount();

    // Calculate pagination meta
    const total_pages = Math.ceil(total / per_page);
    const meta: PaginationMeta = {
      page,
      per_page,
      total,
      total_pages,
    };

    return { accounts, meta };
  }

  async findOne(id: number): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['user', 'user.department'],
    });

    if (!account) {
      throw new NotFoundException('Account tidak ditemukan');
    }

    return account;
  }

  async updateLockStatus(
    id: number,
    updateLockStatusDto: UpdateLockStatusDto,
  ): Promise<Account> {
    const account = await this.findOne(id);

    account.is_locked = updateLockStatusDto.is_locked;
    const updatedAccount = await this.accountRepository.save(account);

    return updatedAccount;
  }

  async updatePassword(
    id: number,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<Account> {
    const account = await this.findOne(id);

    // Hash new password
    const hashedPassword = await bcrypt.hash(updatePasswordDto.password, 10);

    account.password = hashedPassword;
    const updatedAccount = await this.accountRepository.save(account);

    return updatedAccount;
  }

  async remove(id: number): Promise<void> {
    const account = await this.findOne(id);
    await this.accountRepository.remove(account);
  }
}
