import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { extractToken } from 'src/common/utils/extractToken.util';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('User must be Authenticated');
    }

    const token = extractToken(authHeader);

    if (!token) {
      throw new UnauthorizedException('Invalid authorization header format. Expected: Bearer <token>');
    }

    try {
      const user = await this.authService.getCurrentUser(token);
      request.user = user; // Attach user to request object
      return true;
    } catch (error) {
      throw new UnauthorizedException('Access denied');
    }
  }
}