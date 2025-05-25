import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, RequestItem, User, Department } from '../../entities';
import { RequestStatus } from '../../common/enums';
import {
  CreateRequestDto,
  QueryRequestDto,
  UpdateRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  HoldRequestDto,
} from './dto';
import { PaginationMeta } from '../../common/interfaces';

@Injectable()
export class RequestService {
  constructor(
    @InjectRepository(Request)
    private readonly requestRepository: Repository<Request>,
    @InjectRepository(RequestItem)
    private readonly requestItemRepository: Repository<RequestItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async create(createRequestDto: CreateRequestDto): Promise<Request> {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: createRequestDto.user_id },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Check if department exists
    const department = await this.departmentRepository.findOne({
      where: { id: createRequestDto.department_id },
    });

    if (!department) {
      throw new NotFoundException('Department tidak ditemukan');
    }

    // Generate request code
    const requestCode = await this.generateRequestCode();

    // Calculate total amount from request items
    const totalAmount = createRequestDto.request_items.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );

    // Create request
    const request = this.requestRepository.create({
      user_id: createRequestDto.user_id,
      department_id: createRequestDto.department_id,
      request_code: requestCode,
      description: createRequestDto.description,
      status_note: createRequestDto.status_note,
      total_amount: totalAmount,
      status: createRequestDto.status || RequestStatus.DRAFT,
      urgency_level: createRequestDto.urgency_level,
      request_date: new Date(createRequestDto.request_date),
      current_approval_level: 1,
    });

    const savedRequest = await this.requestRepository.save(request);

    // Create request items
    const requestItems = createRequestDto.request_items.map(item => 
      this.requestItemRepository.create({
        ...item,
        request_id: savedRequest.id,
        requested_delivery_date: item.requested_delivery_date 
          ? new Date(item.requested_delivery_date) 
          : null,
      })
    );

    await this.requestItemRepository.save(requestItems);

    // Return with relations
    return await this.findOne(savedRequest.id);
  }

  async findAllWithPagination(queryDto: QueryRequestDto) {
    const {
      query,
      department_id,
      user_id,
      status,
      urgency_level,
      current_approval_level,
      start_date,
      end_date,
      page = 1,
      per_page = 10,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = queryDto;

    const queryBuilder = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.department', 'department')
      .leftJoinAndSelect('request.request_items', 'request_items')
      .leftJoinAndSelect('request.approval_logs', 'approval_logs');

    // Apply search filter
    if (query) {
      queryBuilder.where(
        '(request.request_code ILIKE :query OR request.description ILIKE :query OR user.name ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    // Apply filters
    if (department_id) {
      queryBuilder.andWhere('request.department_id = :department_id', {
        department_id,
      });
    }

    if (user_id) {
      queryBuilder.andWhere('request.user_id = :user_id', { user_id });
    }

    if (status) {
      queryBuilder.andWhere('request.status = :status', { status });
    }

    if (urgency_level) {
      queryBuilder.andWhere('request.urgency_level = :urgency_level', {
        urgency_level,
      });
    }

    if (current_approval_level) {
      queryBuilder.andWhere(
        'request.current_approval_level = :current_approval_level',
        { current_approval_level },
      );
    }

    // Apply date range filter
    if (start_date) {
      queryBuilder.andWhere('request.request_date >= :start_date', {
        start_date,
      });
    }

    if (end_date) {
      queryBuilder.andWhere('request.request_date <= :end_date', {
        end_date,
      });
    }

    // Apply sorting
    const sortDirection = sort_order.toUpperCase() as 'ASC' | 'DESC';
    queryBuilder.orderBy(`request.${sort_by}`, sortDirection);

    // Apply pagination
    const skip = (page - 1) * per_page;
    queryBuilder.skip(skip).take(per_page);

    // Get results and count
    const [requests, total] = await queryBuilder.getManyAndCount();

    // Calculate pagination meta
    const total_pages = Math.ceil(total / per_page);
    const meta: PaginationMeta = {
      page,
      per_page,
      total,
      total_pages,
    };

    return { requests, meta };
  }

  async findOne(id: number): Promise<Request> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: [
        'user',
        'user.department',
        'department', 
        'request_items',
        'approval_logs',
        'approval_logs.approver',
        'approval_logs.approver.user'
      ],
    });

    if (!request) {
      throw new NotFoundException('Request tidak ditemukan');
    }

    return request;
  }

  async update(id: number, updateRequestDto: UpdateRequestDto): Promise<Request> {
    const request = await this.findOne(id);

    // Check if request can be updated (only DRAFT status can be updated)
    if (request.status !== RequestStatus.DRAFT) {
      throw new BadRequestException('Hanya request dengan status DRAFT yang dapat diupdate');
    }

    // Update request fields
    if (updateRequestDto.description !== undefined) {
      request.description = updateRequestDto.description;
    }
    if (updateRequestDto.status_note !== undefined) {
      request.status_note = updateRequestDto.status_note;
    }
    if (updateRequestDto.status !== undefined) {
      request.status = updateRequestDto.status;
    }
    if (updateRequestDto.urgency_level !== undefined) {
      request.urgency_level = updateRequestDto.urgency_level;
    }
    if (updateRequestDto.request_date !== undefined) {
      request.request_date = new Date(updateRequestDto.request_date);
    }

    // Update request items if provided
    if (updateRequestDto.request_items) {
      // Remove existing items
      await this.requestItemRepository.delete({ request_id: id });

      // Calculate new total amount
      const totalAmount = updateRequestDto.request_items.reduce(
        (sum, item) => sum + item.total_price,
        0,
      );
      request.total_amount = totalAmount;

      // Create new items
      const requestItems = updateRequestDto.request_items.map(item => 
        this.requestItemRepository.create({
          ...item,
          request_id: id,
          requested_delivery_date: item.requested_delivery_date 
            ? new Date(item.requested_delivery_date) 
            : null,
        })
      );

      await this.requestItemRepository.save(requestItems);
    }

    await this.requestRepository.save(request);

    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const request = await this.findOne(id);
    
    // Check if request can be deleted (only DRAFT status can be deleted)
    if (request.status !== RequestStatus.DRAFT) {
      throw new BadRequestException('Hanya request dengan status DRAFT yang dapat dihapus');
    }

    // Remove request items first
    await this.requestItemRepository.delete({ request_id: id });

    // Remove request
    await this.requestRepository.remove(request);
  }

  async approve(id: number, approveRequestDto: ApproveRequestDto): Promise<Request> {
    const request = await this.findOne(id);
    
    // TODO: Implement approval logic
    // This will be implemented in next iteration with proper approval workflow
    
    throw new BadRequestException('Fitur approve belum diimplementasi');
  }

  async reject(id: number, rejectRequestDto: RejectRequestDto): Promise<Request> {
    const request = await this.findOne(id);
    
    // TODO: Implement rejection logic
    // This will be implemented in next iteration with proper approval workflow
    
    throw new BadRequestException('Fitur reject belum diimplementasi');
  }

  async cancel(id: number): Promise<Request> {
    const request = await this.findOne(id);
    
    // TODO: Implement cancel logic
    // This will be implemented in next iteration
    
    throw new BadRequestException('Fitur cancel belum diimplementasi');
  }

  async complete(id: number): Promise<Request> {
    const request = await this.findOne(id);
    
    // TODO: Implement complete logic
    // This will be implemented in next iteration
    
    throw new BadRequestException('Fitur complete belum diimplementasi');
  }

  async hold(id: number, holdRequestDto: HoldRequestDto): Promise<Request> {
    const request = await this.findOne(id);
    
    // TODO: Implement hold logic
    // This will be implemented in next iteration
    
    throw new BadRequestException('Fitur hold belum diimplementasi');
  }

  private async generateRequestCode(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    
    const prefix = `REQ-${year}${month}${date}`;
    
    // Find the latest request code for today
    const latestRequest = await this.requestRepository
      .createQueryBuilder('request')
      .where('request.request_code LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('request.request_code', 'DESC')
      .getOne();

    let sequence = 1;
    if (latestRequest) {
      const lastSequence = latestRequest.request_code.split('-')[1];
      sequence = parseInt(lastSequence.substring(8)) + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }
} 