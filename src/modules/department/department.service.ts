import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../entities/department.entity';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  QueryDepartmentDto,
} from './dto';
import { PaginationMeta } from '../../common/interfaces';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    // Check if code already exists
    const existingDepartment = await this.departmentRepository.findOne({
      where: { code: createDepartmentDto.code },
    });

    if (existingDepartment) {
      throw new ConflictException('Kode department sudah digunakan');
    }

    const department = this.departmentRepository.create({
      ...createDepartmentDto,
      is_active: createDepartmentDto.is_active ?? true,
      approval_layers: createDepartmentDto.approval_layers ?? 1,
    });

    return await this.departmentRepository.save(department);
  }

  async findAllWithPagination(queryDto: QueryDepartmentDto) {
    const {
      query,
      page = 1,
      per_page = 10,
      sort_by = 'name',
      sort_order = 'asc',
    } = queryDto;

    const queryBuilder =
      this.departmentRepository.createQueryBuilder('department');

    // Apply search filter
    if (query) {
      queryBuilder.where(
        '(department.name ILIKE :query OR department.code ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    // Apply sorting
    const sortDirection = sort_order.toUpperCase() as 'ASC' | 'DESC';
    queryBuilder.orderBy(`department.${sort_by}`, sortDirection);

    // Apply pagination
    const skip = (page - 1) * per_page;
    queryBuilder.skip(skip).take(per_page);

    // Get results and count
    const [departments, total] = await queryBuilder.getManyAndCount();

    // Calculate pagination meta
    const total_pages = Math.ceil(total / per_page);
    const meta: PaginationMeta = {
      page,
      per_page,
      total,
      total_pages,
    };

    return { departments, meta };
  }

  async findAll(): Promise<Department[]> {
    return await this.departmentRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findAllActive(): Promise<Department[]> {
    return await this.departmentRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['approvers', 'requests'],
    });

    if (!department) {
      throw new NotFoundException('Department tidak ditemukan');
    }

    return department;
  }

  async findByCode(code: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { code },
    });

    if (!department) {
      throw new NotFoundException(
        'Department dengan kode tersebut tidak ditemukan',
      );
    }

    return department;
  }

  async update(
    id: number,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    const department = await this.findOne(id);

    // Check if new code conflicts with existing department
    if (
      updateDepartmentDto.code &&
      updateDepartmentDto.code !== department.code
    ) {
      const existingDepartment = await this.departmentRepository.findOne({
        where: { code: updateDepartmentDto.code },
      });

      if (existingDepartment) {
        throw new ConflictException('Kode department sudah digunakan');
      }
    }

    Object.assign(department, updateDepartmentDto);
    return await this.departmentRepository.save(department);
  }

  async remove(id: number): Promise<void> {
    const department = await this.findOne(id);
    // Check if department has related data
    const departmentWithRelations = await this.departmentRepository.findOne({
      where: { id },
      relations: ['approvers', 'requests'],
    });

    if (
      departmentWithRelations.approvers?.length > 0 ||
      departmentWithRelations.requests?.length > 0
    ) {
      throw new ConflictException(
        'Department tidak dapat dihapus karena masih memiliki data terkait',
      );
    }

    await this.departmentRepository.remove(department);
  }

  async toggleStatus(id: number): Promise<Department> {
    const department = await this.findOne(id);
    department.is_active = !department.is_active;
    return await this.departmentRepository.save(department);
  }
}
