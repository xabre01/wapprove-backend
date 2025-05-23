import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TokenPayload } from '../interfaces';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      ignoreExpiration: true,
      secretOrKey: configService.get('jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: TokenPayload) {
    try {
      const refreshToken = req.body.refresh_token;
      const user = await this.authService.validateRefreshToken(
        refreshToken,
        payload.sub,
      );

      if (!user) {
        throw new UnauthorizedException('Token refresh tidak valid');
      }

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch (error) {
      // Handle JWT expired error specifically
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException({
          message: 'Refresh token sudah expired. Silakan login ulang.',
          code: 'REFRESH_TOKEN_EXPIRED',
          statusCode: 400,
        });
      }

      // Handle JWT malformed error
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException({
          message: 'Format refresh token tidak valid. Silakan login ulang.',
          code: 'REFRESH_TOKEN_MALFORMED',
          statusCode: 400,
        });
      }

      // Re-throw other errors as-is
      throw error;
    }
  }
}
