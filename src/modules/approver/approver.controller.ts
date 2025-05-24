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
} from '@nestjs/common';
import { ApproverService } from './approver.service';
import {
  CreateApproverDto,
  QueryApproverDto,
  UpdateApproverDto,
} from './dto';
import { ApiResponse, ApiResponseWithMeta } from '../../common/interfaces';
import { AdminOnly } from '../../common/decorators';
import { Approver } from '../../entities';

@Controller('approvers')
@AdminOnly()
export class ApproverController {
  constructor(private readonly approverService: ApproverService) {}

  private mapApproverResponse(approver: Approver) {
    return {
      id: approver.id.toString(),
      user_id: approver.user_id.toString(),
      department_id: approver.department_id.toString(),
      user: approver.user
        ? {
            id: approver.user.id.toString(),
            name: approver.user.name,
            email: approver.user.email,
            phone_number: approver.user.phone_number,
            role: approver.user.role,
            is_active: approver.user.is_active,
            department: approver.user.department
              ? {
                  id: approver.user.department.id.toString(),
                  name: approver.user.department.name,
                  code: approver.user.department.code,
                }
              : null,
          }
        : null,
      department: approver.department
        ? {
            id: approver.department.id.toString(),
            name: approver.department.name,
            code: approver.department.code,
            is_active: approver.department.is_active,
          }
        : null,
      approver_type: approver.approver_type,
      approval_level: approver.approval_level,
      created_at: approver.created_at,
      updated_at: approver.updated_at,
    };
  }

  @Post()
  async create(
    @Body() createApproverDto: CreateApproverDto,
  ): Promise<ApiResponse<any>> {
    const approver = await this.approverService.create(createApproverDto);

    return {
      message: 'Approver berhasil dibuat',
      data: this.mapApproverResponse(approver),
    };
  }

  @Get()
  async findAll(
    @Query() queryDto: QueryApproverDto,
  ): Promise<ApiResponseWithMeta<any[]>> {
    const { approvers, meta } =
      await this.approverService.findAllWithPagination(queryDto);

    const mappedApprovers = approvers.map((approver) => this.mapApproverResponse(approver));

    return {
      message: 'Data approver berhasil diambil',
      data: mappedApprovers,
      meta,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<any>> {
    const approver = await this.approverService.findOne(id);

    return {
      message: 'Data approver berhasil diambil',
      data: this.mapApproverResponse(approver),
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateApproverDto: UpdateApproverDto,
  ): Promise<ApiResponse<any>> {
    const approver = await this.approverService.update(id, updateApproverDto);

    return {
      message: 'Approver berhasil diperbarui',
      data: this.mapApproverResponse(approver),
    };
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<void>> {
    await this.approverService.remove(id);

    return {
      message: 'Approver berhasil dihapus',
      data: null,
    };
  }
}

// Separate controller for department-specific approvers
@Controller('departments')
@AdminOnly()
export class DepartmentApproverController {
  constructor(private readonly approverService: ApproverService) {}

  private mapApproverResponse(approver: Approver) {
    return {
      id: approver.id.toString(),
      user_id: approver.user_id.toString(),
      department_id: approver.department_id.toString(),
      user: approver.user
        ? {
            id: approver.user.id.toString(),
            name: approver.user.name,
            email: approver.user.email,
            phone_number: approver.user.phone_number,
            role: approver.user.role,
            is_active: approver.user.is_active,
            department: approver.user.department
              ? {
                  id: approver.user.department.id.toString(),
                  name: approver.user.department.name,
                  code: approver.user.department.code,
                }
              : null,
          }
        : null,
      department: approver.department
        ? {
            id: approver.department.id.toString(),
            name: approver.department.name,
            code: approver.department.code,
            is_active: approver.department.is_active,
          }
        : null,
      approver_type: approver.approver_type,
      approval_level: approver.approval_level,
      created_at: approver.created_at,
      updated_at: approver.updated_at,
    };
  }

  @Get(':department_id/approvers')
  async getApproversByDepartment(
    @Param('department_id', ParseIntPipe) department_id: number,
  ): Promise<ApiResponse<any[]>> {
    const approvers = await this.approverService.findByDepartment(department_id);

    const mappedApprovers = approvers.map((approver) => this.mapApproverResponse(approver));

    return {
      message: 'Data approver berdasarkan department berhasil diambil',
      data: mappedApprovers,
    };
  }
} 