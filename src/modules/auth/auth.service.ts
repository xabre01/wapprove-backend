import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User, Account } from '../../entities';
import { LoginDto } from './dto';
import { TokenPayload } from './interfaces';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email, is_active: true },
      relations: ['account'],
    });

    if (!user || !user.account) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.account.password,
    );
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    user.account.last_login = new Date();
    await this.accountRepository.save(user.account);

    const { ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new BadRequestException('Email atau password tidak valid');
    }

    const tokens = await this.generateTokens(user);

    // Save refresh token to database
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshToken(userId: number, refreshToken: string) {
    const account = await this.accountRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });

    if (
      !account ||
      !account.refresh_token ||
      account.refresh_token !== refreshToken
    ) {
      throw new UnauthorizedException('Token refresh tidak valid');
    }

    const tokens = await this.generateTokens(account.user);
    await this.updateRefreshToken(userId, tokens.refresh_token);

    return tokens;
  }

  async validateRefreshToken(refreshToken: string, userId: number) {
    const account = await this.accountRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });

    if (
      !account ||
      !account.refresh_token ||
      account.refresh_token !== refreshToken
    ) {
      return null;
    }

    return account.user;
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone_number: user.phone_number,
      },
    };
  }

  private async generateTokens(user: User) {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Access token payload
    const accessPayload = { ...payload, type: 'access' };

    // Refresh token payload
    const refreshPayload = { ...payload, type: 'refresh' };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: this.configService.get('jwt.refreshTokenExpires'),
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async updateRefreshToken(userId: number, refreshToken: string) {
    await this.accountRepository.update(
      { user_id: userId },
      { refresh_token: refreshToken },
    );
  }
}
