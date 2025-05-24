import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Approver, User, Department } from '../../entities';
import {
  CreateApproverDto,
  QueryApproverDto,
  UpdateApproverDto,
} from './dto';
import { PaginationMeta } from '../../common/interfaces';

@Injectable()
export class ApproverService {
  constructor(
    @InjectRepository(Approver)
    private readonly approverRepository: Repository<Approver>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async create(createApproverDto: CreateApproverDto): Promise<Approver> {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: createApproverDto.user_id },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Check if department exists
    const department = await this.departmentRepository.findOne({
      where: { id: createApproverDto.department_id },
    });

    if (!department) {
      throw new NotFoundException('Department tidak ditemukan');
    }

    // Check if approver already exists for this user and department
    const existingApprover = await this.approverRepository.findOne({
      where: {
        user_id: createApproverDto.user_id,
        department_id: createApproverDto.department_id,
        approver_type: createApproverDto.approver_type,
      },
    });

    if (existingApprover) {
      throw new ConflictException('Approver sudah ada untuk user, department, dan type ini');
    }

    // Create approver
    const approver = this.approverRepository.create({
      user_id: createApproverDto.user_id,
      department_id: createApproverDto.department_id,
      approver_type: createApproverDto.approver_type,
      approval_level: createApproverDto.approval_level,
    });

    const savedApprover = await this.approverRepository.save(approver);

    // Return with relations
    return await this.findOne(savedApprover.id);
  }

  async findAllWithPagination(queryDto: QueryApproverDto) {
    const {
      query,
      department_id,
      approver_type,
      approval_level,
      page = 1,
      per_page = 10,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = queryDto;

    const queryBuilder = this.approverRepository
      .createQueryBuilder('approver')
      .leftJoinAndSelect('approver.user', 'user')
      .leftJoinAndSelect('approver.department', 'department');

    // Apply search filter
    if (query) {
      queryBuilder.where(
        '(user.name ILIKE :query OR user.email ILIKE :query OR department.name ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    // Apply department filter
    if (department_id) {
      queryBuilder.andWhere('approver.department_id = :department_id', {
        department_id,
      });
    }

    // Apply approver_type filter
    if (approver_type) {
      queryBuilder.andWhere('approver.approver_type = :approver_type', {
        approver_type,
      });
    }

    // Apply approval_level filter
    if (approval_level) {
      queryBuilder.andWhere('approver.approval_level = :approval_level', {
        approval_level,
      });
    }

    // Apply sorting
    const sortDirection = sort_order.toUpperCase() as 'ASC' | 'DESC';
    if (sort_by === 'user_id') {
      queryBuilder.orderBy('user.name', sortDirection);
    } else if (sort_by === 'department_id') {
      queryBuilder.orderBy('department.name', sortDirection);
    } else {
      queryBuilder.orderBy(`approver.${sort_by}`, sortDirection);
    }

    // Apply pagination
    const skip = (page - 1) * per_page;
    queryBuilder.skip(skip).take(per_page);

    // Get results and count
    const [approvers, total] = await queryBuilder.getManyAndCount();

    // Calculate pagination meta
    const total_pages = Math.ceil(total / per_page);
    const meta: PaginationMeta = {
      page,
      per_page,
      total,
      total_pages,
    };

    return { approvers, meta };
  }

  async findOne(id: number): Promise<Approver> {
    const approver = await this.approverRepository.findOne({
      where: { id },
      relations: ['user', 'user.department', 'department'],
    });

    if (!approver) {
      throw new NotFoundException('Approver tidak ditemukan');
    }

    return approver;
  }

  async findByDepartment(departmentId: number): Promise<Approver[]> {
    return await this.approverRepository.find({
      where: { department_id: departmentId },
      relations: ['user', 'user.department', 'department'],
      order: { approval_level: 'ASC', created_at: 'DESC' },
    });
  }

  async update(id: number, updateApproverDto: UpdateApproverDto): Promise<Approver> {
    const approver = await this.findOne(id);

    // Check if user exists (if user_id is being updated)
    if (updateApproverDto.user_id) {
      const user = await this.userRepository.findOne({
        where: { id: updateApproverDto.user_id },
      });

      if (!user) {
        throw new NotFoundException('User tidak ditemukan');
      }
    }

    // Check if department exists (if department_id is being updated)
    if (updateApproverDto.department_id) {
      const department = await this.departmentRepository.findOne({
        where: { id: updateApproverDto.department_id },
      });

      if (!department) {
        throw new NotFoundException('Department tidak ditemukan');
      }
    }

    // Check for conflicts if key fields are being updated
    if (updateApproverDto.user_id || updateApproverDto.department_id || updateApproverDto.approver_type) {
      const existingApprover = await this.approverRepository.findOne({
        where: {
          user_id: updateApproverDto.user_id || approver.user_id,
          department_id: updateApproverDto.department_id || approver.department_id,
          approver_type: updateApproverDto.approver_type || approver.approver_type,
        },
      });

      if (existingApprover && existingApprover.id !== id) {
        throw new ConflictException('Approver sudah ada untuk user, department, dan type ini');
      }
    }

    // Update approver
    const updateData: Partial<Approver> = {};
    if (updateApproverDto.user_id !== undefined) updateData.user_id = updateApproverDto.user_id;
    if (updateApproverDto.department_id !== undefined) updateData.department_id = updateApproverDto.department_id;
    if (updateApproverDto.approver_type !== undefined) updateData.approver_type = updateApproverDto.approver_type;
    if (updateApproverDto.approval_level !== undefined) updateData.approval_level = updateApproverDto.approval_level;

    await this.approverRepository.update(id, updateData);

    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const approver = await this.findOne(id);
    await this.approverRepository.remove(approver);
  }
} 