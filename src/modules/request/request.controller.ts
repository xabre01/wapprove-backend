import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RequestService } from './request.service';
import {
  CreateRequestDto,
  QueryRequestDto,
  UpdateRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  HoldRequestDto,
} from './dto';
import { ApiResponse, ApiResponseWithMeta } from '../../common/interfaces';
import { RequireAuth } from '../../common/decorators';
import { Request } from '../../entities';

@Controller('requests')
@RequireAuth()
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  private mapRequestResponse(request: Request) {
    return {
      id: request.id.toString(),
      user_id: request.user_id.toString(),
      department_id: request.department_id.toString(),
      request_code: request.request_code,
      description: request.description,
      status_note: request.status_note,
      total_amount: request.total_amount,
      current_approval_level: request.current_approval_level,
      status: request.status,
      urgency_level: request.urgency_level,
      request_date: request.request_date,
      user: request.user
        ? {
            id: request.user.id.toString(),
            name: request.user.name,
            email: request.user.email,
            phone_number: request.user.phone_number,
            role: request.user.role,
            is_active: request.user.is_active,
            department: request.user.department
              ? {
                  id: request.user.department.id.toString(),
                  name: request.user.department.name,
                  code: request.user.department.code,
                }
              : null,
          }
        : null,
      department: request.department
        ? {
            id: request.department.id.toString(),
            name: request.department.name,
            code: request.department.code,
            is_active: request.department.is_active,
          }
        : null,
      request_items: request.request_items?.map((item) => ({
        id: item.id.toString(),
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        specifications: item.specifications,
        category: item.category,
        requested_delivery_date: item.requested_delivery_date,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) || [],
      approval_logs: request.approval_logs?.map((log) => ({
        id: log.id.toString(),
        approver_id: log.approver_id.toString(),
        approval_status: log.approval_status,
        notes: log.notes,
        created_at: log.created_at,
        updated_at: log.updated_at,
        approver: log.approver
          ? {
              id: log.approver.id.toString(),
              user_id: log.approver.user_id.toString(),
              department_id: log.approver.department_id.toString(),
              approver_type: log.approver.approver_type,
              approval_level: log.approver.approval_level,
              user: log.approver.user
                ? {
                    id: log.approver.user.id.toString(),
                    name: log.approver.user.name,
                    email: log.approver.user.email,
                    role: log.approver.user.role,
                  }
                : null,
            }
          : null,
      })) || [],
      created_at: request.created_at,
      updated_at: request.updated_at,
    };
  }

  @Post()
  async create(
    @Body() createRequestDto: CreateRequestDto,
  ): Promise<ApiResponse<any>> {
    const request = await this.requestService.create(createRequestDto);

    return {
      message: 'Request berhasil dibuat',
      data: this.mapRequestResponse(request),
    };
  }

  @Get()
  async findAll(
    @Query() queryDto: QueryRequestDto,
  ): Promise<ApiResponseWithMeta<any[]>> {
    const { requests, meta } =
      await this.requestService.findAllWithPagination(queryDto);

    const mappedRequests = requests.map((request) => this.mapRequestResponse(request));

    return {
      message: 'Data request berhasil diambil',
      data: mappedRequests,
      meta,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<any>> {
    const request = await this.requestService.findOne(id);

    return {
      message: 'Data request berhasil diambil',
      data: this.mapRequestResponse(request),
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRequestDto: UpdateRequestDto,
  ): Promise<ApiResponse<any>> {
    const request = await this.requestService.update(id, updateRequestDto);

    return {
      message: 'Request berhasil diperbarui',
      data: this.mapRequestResponse(request),
    };
  }

  @Delete(':id')
  async remove(): Promise<ApiResponse<void>> {
    throw new HttpException(
      {
        message: 'Fitur hapus request belum tersedia',
        error: 'Not Implemented',
        statusCode: 501,
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  @Post(':id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveRequestDto: ApproveRequestDto,
  ): Promise<ApiResponse<any>> {
    const request = await this.requestService.approve(id, approveRequestDto);

    return {
      message: 'Request berhasil diapprove',
      data: this.mapRequestResponse(request),
    };
  }

  @Post(':id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() rejectRequestDto: RejectRequestDto,
  ): Promise<ApiResponse<any>> {
    const request = await this.requestService.reject(id, rejectRequestDto);

    return {
      message: 'Request berhasil direject',
      data: this.mapRequestResponse(request),
    };
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<any>> {
    const request = await this.requestService.cancel(id);

    return {
      message: 'Request berhasil dicancel',
      data: this.mapRequestResponse(request),
    };
  }

  @Post(':id/complete')
  async complete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<any>> {
    const request = await this.requestService.complete(id);

    return {
      message: 'Request berhasil dicomplete',
      data: this.mapRequestResponse(request),
    };
  }

  @Post(':id/hold')
  async hold(
    @Param('id', ParseIntPipe) id: number,
    @Body() holdRequestDto: HoldRequestDto,
  ): Promise<ApiResponse<any>> {
    const request = await this.requestService.hold(id, holdRequestDto);

    return {
      message: 'Request berhasil dihold',
      data: this.mapRequestResponse(request),
    };
  }
} 