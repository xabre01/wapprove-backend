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
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto';
import { ApiResponse, ApiResponseWithMeta } from '../../common/interfaces';
import { AdminOnly } from '../../common/decorators';

@Controller('users')
@AdminOnly()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<ApiResponse<any>> {
    const user = await this.userService.create(createUserDto);

    return {
      message: 'User berhasil dibuat',
      data: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        department_id: user.department_id,
        department: user.department
          ? {
              id: user.department.id.toString(),
              name: user.department.name,
              code: user.department.code,
            }
          : null,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  }

  @Get()
  async findAll(
    @Query() queryDto: QueryUserDto,
  ): Promise<ApiResponseWithMeta<any[]>> {
    const { users, meta } =
      await this.userService.findAllWithPagination(queryDto);

    const mappedUsers = users.map((user) => ({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      department_id: user.department_id,
      department: user.department
        ? {
            id: user.department.id.toString(),
            name: user.department.name,
            code: user.department.code,
          }
        : null,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }));

    return {
      message: 'Data user berhasil diambil',
      data: mappedUsers,
      meta,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<any>> {
    const user = await this.userService.findOne(id);

    return {
      message: 'Data user berhasil diambil',
      data: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        department_id: user.department_id,
        department: user.department
          ? {
              id: user.department.id.toString(),
              name: user.department.name,
              code: user.department.code,
            }
          : null,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<any>> {
    const user = await this.userService.update(id, updateUserDto);

    return {
      message: 'User berhasil diperbarui',
      data: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        department_id: user.department_id,
        department: user.department
          ? {
              id: user.department.id.toString(),
              name: user.department.name,
              code: user.department.code,
            }
          : null,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  }

  @Delete(':id')
  async remove(): Promise<ApiResponse<void>> {
    throw new HttpException(
      {
        message: 'Fitur hapus user belum tersedia',
        error: 'Not Implemented',
        statusCode: 501,
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
