import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, RequestItem, User, Department, Approver, ApprovalLog } from '../../entities';
import { RequestStatus, UserRole, ApprovalStatus, ApproverType } from '../../common/enums';
import {
  CreateRequestDto,
  QueryRequestDto,
  UpdateRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  HoldRequestDto,
} from './dto';
import { PaginationMeta, CurrentUserData } from '../../common/interfaces';
import { NotificationService } from '../notifications/notification.service';

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
    @InjectRepository(Approver)
    private readonly approverRepository: Repository<Approver>,
    @InjectRepository(ApprovalLog)
    private readonly approvalLogRepository: Repository<ApprovalLog>,
    private readonly notificationService: NotificationService,
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

    // Determine initial status based on approval layers
    const initialStatus = await this.determineInitialStatus(createRequestDto.department_id);

    // Create request
    const request = this.requestRepository.create({
      user_id: createRequestDto.user_id,
      department_id: createRequestDto.department_id,
      request_code: requestCode,
      description: createRequestDto.description,
      status_note: createRequestDto.status_note,
      total_amount: totalAmount,
      status: createRequestDto.status || initialStatus,
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

    // Send approval notifications if request is in approval status
    if (savedRequest.status !== RequestStatus.DRAFT) {
      try {
        await this.sendApprovalNotificationsForRequest(savedRequest);
      } catch (error) {
        console.error('Failed to send approval notifications:', error);
        // Don't fail the request creation if notification fails
      }
    }

    // Return with relations
    return await this.findOneInternal(savedRequest.id);
  }

  private async determineInitialStatus(departmentId: number): Promise<RequestStatus> {
    // Get approval layers for this department
    const approvalLayers = await this.getApprovalLayers(departmentId);
    
    if (approvalLayers.length === 0) {
      // No approval layers, go directly to purchasing
      return RequestStatus.PENDING_PURCHASING_APPROVAL;
    }

    // Start with first approval layer
    const firstLayer = approvalLayers[0];
    if (firstLayer.approver_type === ApproverType.MANAGER) {
      return RequestStatus.PENDING_MANAGER_APPROVAL;
    } else if (firstLayer.approver_type === ApproverType.DIRECTOR) {
      return RequestStatus.PENDING_DIRECTOR_APPROVAL;
    }

    // Default to purchasing if no specific approver type
    return RequestStatus.PENDING_PURCHASING_APPROVAL;
  }

  private async getApprovalLayers(departmentId: number) {
    return await this.approverRepository
      .createQueryBuilder('approver')
      .where('approver.department_id = :departmentId', { departmentId })
      .orderBy('approver.approval_level', 'ASC')
      .getMany();
  }

  async findAllWithPagination(queryDto: QueryRequestDto, currentUserData: CurrentUserData) {
    // Get full user entity with department relation
    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserData.id },
      relations: ['department'],
    });

    if (!currentUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

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
      .leftJoinAndSelect('request.approval_logs', 'approval_logs')
      .leftJoinAndSelect('approval_logs.approver', 'approver')
      .leftJoinAndSelect('approver.user', 'approver_user')
      .leftJoinAndSelect('approver.department', 'approver_department')

    // Apply role-based filtering
    await this.applyRoleBasedFilter(queryBuilder, currentUser);

    // Apply search filter
    if (query) {
      queryBuilder.andWhere(
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

  private async applyRoleBasedFilter(queryBuilder: any, currentUser: User) {
    switch (currentUser.role) {
      case UserRole.STAFF:
        // Staff hanya bisa melihat request yang dibuat dirinya sendiri
        queryBuilder.andWhere('request.user_id = :currentUserId', {
          currentUserId: currentUser.id,
        });
        break;

      case UserRole.MANAGER:
        // Manager hanya bisa melihat request dari departemen nya sendiri
        if (!currentUser.department_id) {
          // Jika manager tidak memiliki department, tidak ada request yang bisa dilihat
          queryBuilder.andWhere('1 = 0'); // Always false condition
        } else {
          queryBuilder.andWhere('request.department_id = :managerDepartmentId', {
            managerDepartmentId: currentUser.department_id,
          });
        }
        break;

      case UserRole.DIRECTOR:
        // Director hanya bisa melihat request dari departemen yang dia terdaftar sebagai approver
        const directorDepartments = await this.approverRepository
          .createQueryBuilder('approver')
          .select('approver.department_id')
          .where('approver.user_id = :directorId', { directorId: currentUser.id })
          .getRawMany();

        const departmentIds = directorDepartments.map(dept => dept.department_id);

        if (departmentIds.length === 0) {
          // Jika director tidak terdaftar sebagai approver di department manapun
          queryBuilder.andWhere('1 = 0'); // Always false condition
        } else {
          queryBuilder.andWhere('request.department_id IN (:...directorDepartmentIds)', {
            directorDepartmentIds: departmentIds,
          });
        }
        break;

      case UserRole.ADMIN:
      case UserRole.PURCHASING:
        // Admin dan Purchasing dapat melihat semua request - tidak ada filter tambahan
        break;

      default:
        // Untuk role yang tidak dikenal, tidak ada akses
        queryBuilder.andWhere('1 = 0'); // Always false condition
        break;
    }
  }

  async findOne(id: number, currentUserData?: CurrentUserData): Promise<Request> {
    const request = await this.findOneInternal(id);

    // If currentUserData provided, check role-based access
    if (currentUserData) {
      const hasAccess = await this.checkRequestAccess(request, currentUserData);
      if (!hasAccess) {
        throw new NotFoundException('Request tidak ditemukan');
      }
    }

    return request;
  }

  private async findOneInternal(id: number): Promise<Request> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: [
        'user',
        'user.department',
        'department', 
        'request_items',
        'approval_logs',
        'approval_logs.approver',
        'approval_logs.approver.user',
        'approval_logs.approver.department'
      ],
    });

    if (!request) {
      throw new NotFoundException('Request tidak ditemukan');
    }

    return request;
  }

  private async checkRequestAccess(request: Request, currentUserData: CurrentUserData): Promise<boolean> {
    // Get full user entity
    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserData.id },
      relations: ['department'],
    });

    if (!currentUser) {
      return false;
    }

    switch (currentUser.role) {
      case UserRole.STAFF:
        // Staff hanya bisa melihat request yang dibuat dirinya sendiri
        return request.user_id === currentUser.id;

      case UserRole.MANAGER:
        // Manager hanya bisa melihat request dari departemen nya sendiri
        if (!currentUser.department_id) {
          return false;
        }
        return request.department_id === currentUser.department_id;

      case UserRole.DIRECTOR:
        // Director hanya bisa melihat request dari departemen yang dia terdaftar sebagai approver
        const directorDepartments = await this.approverRepository
          .createQueryBuilder('approver')
          .select('approver.department_id')
          .where('approver.user_id = :directorId', { directorId: currentUser.id })
          .getRawMany();

        const departmentIds = directorDepartments.map(dept => dept.department_id);
        return departmentIds.includes(request.department_id);

      case UserRole.ADMIN:
      case UserRole.PURCHASING:
        // Admin dan Purchasing dapat melihat semua request
        return true;

      default:
        // Untuk role yang tidak dikenal, tidak ada akses
        return false;
    }
  }

  async update(id: number, updateRequestDto: UpdateRequestDto): Promise<Request> {
    const request = await this.findOneInternal(id);

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

    return await this.findOneInternal(id);
  }

  async remove(id: number): Promise<void> {
    const request = await this.findOneInternal(id);
    
    // Check if request can be deleted (only DRAFT status can be deleted)
    if (request.status !== RequestStatus.DRAFT) {
      throw new BadRequestException('Hanya request dengan status DRAFT yang dapat dihapus');
    }

    // Remove request items first
    await this.requestItemRepository.delete({ request_id: id });

    // Remove request
    await this.requestRepository.remove(request);
  }

  async approve(id: number, approveRequestDto: ApproveRequestDto, currentUserData: CurrentUserData): Promise<Request> {
    const request = await this.findOneInternal(id);
    
    // Get current user with department
    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserData.id },
      relations: ['department'],
    });

    if (!currentUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Check if user has permission to approve this request
    await this.checkApprovalPermission(request, currentUser);

    // Get or create approver record for current user and request department
    let approver = await this.approverRepository.findOne({
      where: {
        user_id: currentUser.id,
        department_id: request.department_id,
      },
    });

    // For admin and purchasing, create virtual approver if not exists
    if (!approver && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PURCHASING)) {
      // Create virtual approver for admin/purchasing
      approver = this.approverRepository.create({
        user_id: currentUser.id,
        department_id: request.department_id,
        approver_type: ApproverType.PURCHASING, // Admin and purchasing use PURCHASING type
        approval_level: 999, // High level to indicate final approval
      });
      
      approver = await this.approverRepository.save(approver);
    }

    if (!approver) {
      throw new ForbiddenException('Anda tidak memiliki akses untuk approve request ini');
    }

    // Check if user already approved this request
    const existingApproval = await this.approvalLogRepository.findOne({
      where: {
        request_id: id,
        approver_id: approver.id,
        approval_status: ApprovalStatus.APPROVED,
      },
    });

    if (existingApproval) {
      throw new BadRequestException('Anda sudah melakukan approval untuk request ini');
    }

    // For manager and director, check approval level
    if (currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.DIRECTOR) {
      // Check if user can approve at current approval level
      if (request.current_approval_level !== approver.approval_level) {
        throw new BadRequestException(`Request sedang berada di approval level ${request.current_approval_level}, Anda hanya bisa approve di level ${approver.approval_level}`);
      }
    }

    // Create approval log
    const approvalLog = this.approvalLogRepository.create({
      request_id: id,
      approver_id: approver.id,
      approval_status: ApprovalStatus.APPROVED,
      notes: approveRequestDto.notes,
    });

    await this.approvalLogRepository.save(approvalLog);

    // For admin and purchasing, directly set to fully approved
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PURCHASING) {
      request.status = RequestStatus.FULLY_APPROVED;
      await this.requestRepository.update(request.id, {
        status: request.status,
      });
    } else {
      // For manager and director, check if all approvers at current level have approved
      const allApprovedAtLevel = await this.checkAllApprovedAtLevel(request.department_id, request.current_approval_level, id);

      if (allApprovedAtLevel) {
        // Move to next status
        await this.moveToNextApprovalStatus(request);
      }
    }

    // Send approval notifications if request is in approval status
    if (request.status !== RequestStatus.DRAFT) {
      try {
        await this.sendApprovalNotificationsForRequest(request);
      } catch (error) {
        console.error('Failed to send approval notifications:', error);
        // Don't fail the request approval if notification fails
      }
    }

    // Send status update notification to requester
    try {
      await this.notificationService.sendStatusUpdateNotificationToUser({
        phoneNumber: request.user.phone_number,
        requestCode: request.request_code,
        status: request.status,
        approverName: currentUser.name,
        notes: approveRequestDto.notes,
        userId: request.user.id,
        requestId: request.id,
      });
    } catch (error) {
      console.error('Failed to send status update notification:', error);
    }

    return await this.findOneInternal(id);
  }

  private async checkApprovalPermission(request: Request, currentUser: User) {
    // Staff cannot approve
    if (currentUser.role === UserRole.STAFF) {
      throw new ForbiddenException('Staff tidak dapat melakukan approval');
    }

    // Check role-based approval permissions
    switch (currentUser.role) {
      case UserRole.MANAGER:
        if (request.status !== RequestStatus.PENDING_MANAGER_APPROVAL) {
          throw new BadRequestException('Request tidak dalam status PENDING_MANAGER_APPROVAL');
        }
        if (currentUser.department_id !== request.department_id) {
          throw new ForbiddenException('Manager hanya bisa approve request dari departemen sendiri');
        }
        break;

      case UserRole.DIRECTOR:
        if (request.status !== RequestStatus.PENDING_DIRECTOR_APPROVAL) {
          throw new BadRequestException('Request tidak dalam status PENDING_DIRECTOR_APPROVAL');
        }
        // Check if director is registered as approver for this department
        const directorApprover = await this.approverRepository.findOne({
          where: {
            user_id: currentUser.id,
            department_id: request.department_id,
          },
        });
        if (!directorApprover) {
          throw new ForbiddenException('Director tidak terdaftar sebagai approver untuk departemen ini');
        }
        break;

      case UserRole.ADMIN:
      case UserRole.PURCHASING:
        if (request.status !== RequestStatus.PENDING_PURCHASING_APPROVAL) {
          throw new BadRequestException('Request tidak dalam status PENDING_PURCHASING_APPROVAL');
        }
        break;

      default:
        throw new ForbiddenException('Role tidak memiliki akses approval');
    }
  }

  private async checkAllApprovedAtLevel(departmentId: number, approvalLevel: number, requestId: number): Promise<boolean> {
    // Get all approvers at this level for this department
    const approversAtLevel = await this.approverRepository.find({
      where: {
        department_id: departmentId,
        approval_level: approvalLevel,
      },
    });

    if (approversAtLevel.length === 0) {
      return false;
    }

    // Get all approvals for this request at this level
    const approverIds = approversAtLevel.map(a => a.id);
    const approvals = await this.approvalLogRepository
      .createQueryBuilder('approval_log')
      .where('approval_log.request_id = :requestId', { requestId })
      .andWhere('approval_log.approver_id IN (:...approverIds)', { approverIds })
      .andWhere('approval_log.approval_status = :status', { status: ApprovalStatus.APPROVED })
      .getMany();

    // Check if all approvers at this level have approved
    return approvals.length === approversAtLevel.length;
  }

  private async moveToNextApprovalStatus(request: Request) {
    const approvalLayers = await this.getApprovalLayers(request.department_id);
    
    // Find current layer
    const currentLayer = approvalLayers.find(layer => layer.approval_level === request.current_approval_level);
    
    if (!currentLayer) {
      throw new BadRequestException('Approval layer tidak ditemukan');
    }

    // Update status based on current approver type
    if (currentLayer.approver_type === ApproverType.MANAGER) {
      request.status = RequestStatus.MANAGER_APPROVED;
    } else if (currentLayer.approver_type === ApproverType.DIRECTOR) {
      request.status = RequestStatus.DIRECTOR_APPROVED;
    }

    // Check if there's next approval level
    const nextLayer = approvalLayers.find(layer => layer.approval_level === request.current_approval_level + 1);
    
    if (nextLayer) {
      // Move to next approval level
      request.current_approval_level = nextLayer.approval_level;
      
      if (nextLayer.approver_type === ApproverType.MANAGER) {
        request.status = RequestStatus.PENDING_MANAGER_APPROVAL;
      } else if (nextLayer.approver_type === ApproverType.DIRECTOR) {
        request.status = RequestStatus.PENDING_DIRECTOR_APPROVAL;
      } else if (nextLayer.approver_type === ApproverType.PURCHASING) {
        request.status = RequestStatus.PENDING_PURCHASING_APPROVAL;
      }
    } else {
      // No more approval layers, check if we need purchasing approval
      if (currentLayer.approver_type !== ApproverType.PURCHASING) {
        request.status = RequestStatus.PENDING_PURCHASING_APPROVAL;
        request.current_approval_level = request.current_approval_level + 1;
      } else {
        // Purchasing approved, fully approved
        request.status = RequestStatus.FULLY_APPROVED;
      }
    }

    // Use update instead of save to avoid potential cascade issues
    await this.requestRepository.update(request.id, {
      status: request.status,
      current_approval_level: request.current_approval_level,
    });

    // Setelah move ke level berikutnya, kirim notifikasi ke approver di level baru
    // Tapi hanya jika masih dalam status pending approval
    if (request.status === RequestStatus.PENDING_MANAGER_APPROVAL || 
        request.status === RequestStatus.PENDING_DIRECTOR_APPROVAL || 
        request.status === RequestStatus.PENDING_PURCHASING_APPROVAL) {
      
      // Get updated request with relations for notification
      const updatedRequest = await this.requestRepository.findOne({
        where: { id: request.id },
        relations: ['user'],
      });

      if (updatedRequest) {
        try {
          await this.sendApprovalNotificationsForRequest(updatedRequest);
        } catch (error) {
          console.error('Failed to send approval notifications after level change:', error);
        }
      }
    }
  }

  async reject(id: number, rejectRequestDto: RejectRequestDto, currentUserData: CurrentUserData): Promise<Request> {
    const request = await this.findOneInternal(id);
    
    // Get current user
    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserData.id },
      relations: ['department'],
    });

    if (!currentUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Check if user has permission to reject
    await this.checkRejectPermission(request, currentUser);

    // Get or create approver record for current user and request department
    let approver = await this.approverRepository.findOne({
      where: {
        user_id: currentUser.id,
        department_id: request.department_id,
      },
    });

    // For admin and purchasing, create virtual approver if not exists
    if (!approver && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PURCHASING)) {
      // Create virtual approver for admin/purchasing
      approver = this.approverRepository.create({
        user_id: currentUser.id,
        department_id: request.department_id,
        approver_type: ApproverType.PURCHASING,
        approval_level: 999,
      });
      
      approver = await this.approverRepository.save(approver);
    }

    if (!approver && currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.PURCHASING) {
      throw new ForbiddenException('Anda tidak memiliki akses untuk reject request ini');
    }

    if (!approver) {
      throw new ForbiddenException('Approver record tidak ditemukan');
    }

    // Create rejection log
    const approvalLog = this.approvalLogRepository.create({
      request_id: id,
      approver_id: approver.id,
      approval_status: ApprovalStatus.REJECTED,
      notes: rejectRequestDto.notes,
    });

    await this.approvalLogRepository.save(approvalLog);

    // Update request status to rejected
    request.status = RequestStatus.REJECTED;
    request.status_note = rejectRequestDto.notes;
    await this.requestRepository.update(request.id, {
      status: request.status,
      status_note: request.status_note,
    });

    // Send status update notification to requester
    try {
      await this.notificationService.sendStatusUpdateNotificationToUser({
        phoneNumber: request.user.phone_number,
        requestCode: request.request_code,
        status: request.status,
        approverName: currentUser.name,
        notes: rejectRequestDto.notes,
        userId: request.user.id,
        requestId: request.id,
      });
    } catch (error) {
      console.error('Failed to send status update notification:', error);
    }

    return await this.findOneInternal(id);
  }

  private async checkRejectPermission(request: Request, currentUser: User) {
    // Staff cannot reject
    if (currentUser.role === UserRole.STAFF) {
      throw new ForbiddenException('Staff tidak dapat melakukan rejection');
    }

    // Admin and purchasing can reject anytime (except completed/cancelled)
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PURCHASING) {
      if (request.status === RequestStatus.COMPLETED || request.status === RequestStatus.CANCELLED) {
        throw new BadRequestException('Request yang sudah completed atau cancelled tidak dapat direject');
      }
      return;
    }

    // Manager and Director can only reject when it's their turn
    const validStatuses = [
      RequestStatus.PENDING_MANAGER_APPROVAL,
      RequestStatus.PENDING_DIRECTOR_APPROVAL,
      RequestStatus.DIRECTOR_APPROVED,
    ];

    if (!validStatuses.includes(request.status)) {
      throw new BadRequestException('Request tidak dalam status yang dapat direject');
    }
  }

  async cancel(id: number, currentUserData: CurrentUserData): Promise<Request> {
    const request = await this.findOneInternal(id);
    
    // Get current user
    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserData.id },
    });

    if (!currentUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Only staff who created the request can cancel, or admin/purchasing
    if (currentUser.role === UserRole.STAFF) {
      if (request.user_id !== currentUser.id) {
        throw new ForbiddenException('Staff hanya bisa cancel request yang dibuat sendiri');
      }
    } else if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.PURCHASING) {
      throw new ForbiddenException('Hanya staff pembuat request, admin, atau purchasing yang bisa cancel request');
    }

    // Cannot cancel completed request
    if (request.status === RequestStatus.COMPLETED) {
      throw new BadRequestException('Request yang sudah completed tidak dapat dicancel');
    }

    // Update status to cancelled
    request.status = RequestStatus.CANCELLED;
    await this.requestRepository.save(request);

    return await this.findOneInternal(id);
  }

  async complete(id: number, currentUserData: CurrentUserData): Promise<Request> {
    const request = await this.findOneInternal(id);
    
    // Get current user
    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserData.id },
    });

    if (!currentUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Only admin and purchasing can complete
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.PURCHASING) {
      throw new ForbiddenException('Hanya admin atau purchasing yang bisa complete request');
    }

    // Can only complete if status is IN_PROCESS
    if (request.status !== RequestStatus.IN_PROCESS) {
      throw new BadRequestException('Request harus dalam status IN_PROCESS untuk bisa dicomplete');
    }

    // Update status to completed
    request.status = RequestStatus.COMPLETED;
    await this.requestRepository.save(request);

    return await this.findOneInternal(id);
  }

  async hold(id: number, holdRequestDto: HoldRequestDto, currentUserData: CurrentUserData): Promise<Request> {
    const request = await this.findOneInternal(id);
    
    // Get current user
    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserData.id },
    });

    if (!currentUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Only admin and purchasing can hold
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.PURCHASING) {
      throw new ForbiddenException('Hanya admin atau purchasing yang bisa hold request');
    }

    // Cannot hold completed or cancelled request
    if (request.status === RequestStatus.COMPLETED || request.status === RequestStatus.CANCELLED) {
      throw new BadRequestException('Request yang sudah completed atau cancelled tidak dapat dihold');
    }

    // Update status to on hold
    request.status = RequestStatus.ON_HOLD;
    request.status_note = holdRequestDto.notes;
    await this.requestRepository.save(request);

    return await this.findOneInternal(id);
  }

  async processRequest(id: number, currentUserData: CurrentUserData): Promise<Request> {
    const request = await this.findOneInternal(id);
    
    // Get current user
    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserData.id },
    });

    if (!currentUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Only admin and purchasing can process
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.PURCHASING) {
      throw new ForbiddenException('Hanya admin atau purchasing yang bisa memproses request');
    }

    // Can only process if status is FULLY_APPROVED
    if (request.status !== RequestStatus.FULLY_APPROVED) {
      throw new BadRequestException('Request harus dalam status FULLY_APPROVED untuk bisa diproses');
    }

    // Update status to in process
    request.status = RequestStatus.IN_PROCESS;
    await this.requestRepository.save(request);

    return await this.findOneInternal(id);
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

  private async sendApprovalNotificationsForRequest(request: Request): Promise<void> {
    // Kirim notifikasi approval hanya ke Manager dan Director
    // TIDAK kirim ke Admin dan Purchasing (mereka approve via dashboard)
    
    const approver = await this.getSingleApproverForNotification(request);
    
    if (!approver) {
      // Cek apakah ini adalah level purchasing/admin
      if (request.status === RequestStatus.PENDING_PURCHASING_APPROVAL || 
          request.current_approval_level >= 999) {
        console.log(`ℹ️ Request ${request.request_code} is at purchasing/admin level - NO WhatsApp notification sent (they will approve via dashboard)`);
      } else {
        console.log(`❌ No approver found for WhatsApp notification for request ${request.request_code} at level ${request.current_approval_level}`);
      }
      return;
    }

    // Calculate total amount
    const requestWithItems = await this.requestRepository.findOne({
      where: { id: request.id },
      relations: ['request_items', 'user'],
    });

    const totalAmount = requestWithItems.request_items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price), 
      0
    );

    console.log(`📱 Sending WhatsApp approval notification for request ${request.request_code} to ${approver.userName} at level ${request.current_approval_level}`);

    // Send notification to manager/director only
    await this.notificationService.sendApprovalNotificationToUser({
      phoneNumber: approver.phoneNumber,
      userName: approver.userName,
      requestCode: request.request_code,
      requesterName: requestWithItems.user.name,
      totalAmount,
      approvalLevel: approver.approvalLevel,
      userId: approver.userId,
      requestId: request.id,
    });
  }

  private async getSingleApproverForNotification(request: Request): Promise<{
    userId: number;
    phoneNumber: string;
    userName: string;
    approvalLevel: string;
  } | null> {
    console.log(`🔍 Looking for approver at level ${request.current_approval_level} for department ${request.department_id}`);
    
    const approvalLayers = await this.getApprovalLayers(request.department_id);
    console.log(`📋 Found ${approvalLayers.length} approval layers:`, 
      approvalLayers.map(l => `Level ${l.approval_level} (${l.approver_type})`));
    
    // Find current layer based on current_approval_level
    const currentLayer = approvalLayers.find(layer => layer.approval_level === request.current_approval_level);
    
    if (!currentLayer) {
      console.log(`❌ No approval layer found for level ${request.current_approval_level}`);
      
      // JANGAN kirim notifikasi ke admin/purchasing
      // Mereka akan approve via dashboard saja
      if (request.status === RequestStatus.PENDING_PURCHASING_APPROVAL || 
          request.current_approval_level >= 999) {
        console.log(`💼 Purchasing level reached - NO WhatsApp notification sent to admin/purchasing`);
        return null;
      }
      
      // Fallback 2: Check if we've exceeded normal layers, go to purchasing
      if (approvalLayers.length > 0) {
        const maxLayer = Math.max(...approvalLayers.map(l => l.approval_level));
        if (request.current_approval_level > maxLayer) {
          console.log(`📈 Current level ${request.current_approval_level} > max layer ${maxLayer} - NO WhatsApp notification for purchasing`);
          return null;
        }
      }
      
      console.log(`💥 No valid approver for WhatsApp notification at level ${request.current_approval_level}`);
      return null;
    }

    console.log(`✅ Found current layer: Level ${currentLayer.approval_level} (${currentLayer.approver_type})`);

    // STOP! Jika ini adalah purchasing type, JANGAN kirim notifikasi WhatsApp
    if (currentLayer.approver_type === ApproverType.PURCHASING) {
      console.log(`🚫 Purchasing type detected - NO WhatsApp notification sent to admin/purchasing`);
      return null;
    }

    // Hanya lanjutkan untuk MANAGER dan DIRECTOR
    if (currentLayer.approver_type !== ApproverType.MANAGER && 
        currentLayer.approver_type !== ApproverType.DIRECTOR) {
      console.log(`🚫 Approver type ${currentLayer.approver_type} - NO WhatsApp notification`);
      return null;
    }

    // Get approver at current level - hanya untuk Manager dan Director
    const approver = await this.approverRepository.findOne({
      where: {
        department_id: request.department_id,
        approval_level: request.current_approval_level,
      },
      relations: ['user'],
    });

    if (!approver) {
      console.log(`❌ No approver record found for department ${request.department_id} at level ${request.current_approval_level}`);
      return null;
    }

    if (!approver.user) {
      console.log(`❌ Approver ${approver.id} has no user relation`);
      return null;
    }

    if (!approver.user.phone_number) {
      console.log(`📱 User ${approver.user.name} has no phone number - skipping WhatsApp notification`);
      return null;
    }

    console.log(`🎯 Found manager/director approver: ${approver.user.name} (${approver.user.phone_number})`);
    
    return {
      userId: approver.user.id,
      phoneNumber: approver.user.phone_number,
      userName: approver.user.name,
      approvalLevel: this.getApprovalLevelNameFromApprover(approver),
    };
  }

  private getApprovalLevelNameFromApprover(approver: Approver): string {
    if (approver.approver_type === ApproverType.MANAGER) {
      return `Manager Approval (Level ${approver.approval_level})`;
    } else if (approver.approver_type === ApproverType.DIRECTOR) {
      return `Director Approval (Level ${approver.approval_level})`;
    } else if (approver.approver_type === ApproverType.PURCHASING) {
      return 'Purchasing Approval';
    }

    return `Level ${approver.approval_level} Approval`;
  }
} 