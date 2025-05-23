import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  QueryDepartmentDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDepartmentDto: CreateDepartmentDto) {
    const data = await this.departmentService.create(createDepartmentDto);
    return {
      message: 'Department berhasil dibuat',
      data,
    };
  }

  @Get()
  async findAll(@Query() queryDto: QueryDepartmentDto) {
    // If query parameters are provided, use pagination
    if (
      queryDto.page ||
      queryDto.per_page ||
      queryDto.query ||
      queryDto.sort_by
    ) {
      const { departments, meta } =
        await this.departmentService.findAllWithPagination(queryDto);
      return {
        message: 'Daftar semua department',
        data: departments,
        meta,
      };
    }

    // Otherwise, return all departments without pagination
    const data = await this.departmentService.findAll();
    return {
      message: 'Daftar semua department',
      data,
    };
  }

  @Get('active')
  async findAllActive() {
    const data = await this.departmentService.findAllActive();
    return {
      message: 'Daftar department aktif',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.departmentService.findOne(parseInt(id));
    return {
      message: 'Detail department',
      data,
    };
  }

  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    const data = await this.departmentService.findByCode(code);
    return {
      message: 'Department berdasarkan kode',
      data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    const data = await this.departmentService.update(
      parseInt(id),
      updateDepartmentDto,
    );
    return {
      message: 'Department berhasil diupdate',
      data,
    };
  }

  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id') id: string) {
    const data = await this.departmentService.toggleStatus(parseInt(id));
    return {
      message: 'Status department berhasil diubah',
      data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.departmentService.remove(parseInt(id));
    return {
      message: 'Department berhasil dihapus',
    };
  }
}
