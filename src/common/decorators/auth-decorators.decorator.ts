import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../../modules/auth/guards';
import { Roles } from './roles.decorator';
import { UserRole } from '../enums';

export function AdminOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.ADMIN)
  );
}

export function ManagerOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.MANAGER)
  );
}

export function DirectorOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.DIRECTOR)
  );
}

export function PurchasingOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.PURCHASING)
  );
}

export function AdminOrManager() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.ADMIN, UserRole.MANAGER)
  );
}

export function AdminOrDirector() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.ADMIN, UserRole.DIRECTOR)
  );
}

export function ManagerOrDirector() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.MANAGER, UserRole.DIRECTOR)
  );
}

export function RequireAuth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard)
  );
} 