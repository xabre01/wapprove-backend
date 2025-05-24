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
import { AccountService } from './account.service';
import {
  CreateAccountDto,
  QueryAccountDto,
  UpdateLockStatusDto,
  UpdatePasswordDto,
} from './dto';
import { ApiResponse, ApiResponseWithMeta } from '../../common/interfaces';
import { Account } from 'src/entities';
import { AdminOnly } from '../../common/decorators';

@Controller('accounts')
@AdminOnly()
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  private mapAccountResponse(account: Account) {
    return {
      id: account.id.toString(),
      user_id: account.user_id.toString(),
      user: account.user
        ? {
            id: account.user.id.toString(),
            name: account.user.name,
            role: account.user.role,
            is_active: account.user.is_active,
            email: account.user.email,
            phone_number: account.user.phone_number,
            department: account.user.department
              ? {
                  id: account.user.department.id.toString(),
                  name: account.user.department.name,
                  code: account.user.department.code,
                }
              : null,
          }
        : null,
      is_locked: account.is_locked,
      last_login: account.last_login,
      created_at: account.created_at,
      updated_at: account.updated_at,
    };
  }

  @Post()
  async create(
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<ApiResponse<any>> {
    const account = await this.accountService.create(createAccountDto);

    return {
      message: 'Account berhasil dibuat',
      data: this.mapAccountResponse(account),
    };
  }

  @Get()
  async findAll(
    @Query() queryDto: QueryAccountDto,
  ): Promise<ApiResponseWithMeta<any[]>> {
    const { accounts, meta } =
      await this.accountService.findAllWithPagination(queryDto);

    const mappedAccounts = accounts.map((account) => this.mapAccountResponse(account));

    return {
      message: 'Data account berhasil diambil',
      data: mappedAccounts,
      meta,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<any>> {
    const account = await this.accountService.findOne(id);

    return {
      message: 'Data account berhasil diambil',
      data: this.mapAccountResponse(account),
    };
  }

  @Patch(':id/lock-status')
  async updateLockStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLockStatusDto: UpdateLockStatusDto,
  ): Promise<ApiResponse<any>> {
    const account = await this.accountService.updateLockStatus(
      id,
      updateLockStatusDto,
    );

    return {
      message: 'Status lock account berhasil diperbarui',
      data: this.mapAccountResponse(account),
    };
  }

  @Patch(':id/password')
  async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<ApiResponse<any>> {
    const account = await this.accountService.updatePassword(
      id,
      updatePasswordDto,
    );

    return {
      message: 'Password account berhasil diperbarui',
      data: this.mapAccountResponse(account),
    };
  }

  @Delete(':id')
  async remove(): Promise<ApiResponse<void>> {
    throw new HttpException(
      {
        message: 'Fitur hapus account belum tersedia',
        error: 'Not Implemented',
        statusCode: 501,
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
