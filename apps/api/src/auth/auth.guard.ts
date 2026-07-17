import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    let token: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      const cookieHeader = request.headers.cookie || '';
      const cookieMatch = cookieHeader
        .split(';')
        .map((c: string) => c.trim())
        .find((c: string) => c.startsWith('admin_token='));
      if (cookieMatch) {
        token = cookieMatch.split('=')[1];
      }
    }

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token);
        const clerkId = payload.sub;
        let dbUser = await this.prisma.user.findUnique({ where: { clerkId } });
        if (!dbUser && payload.email) {
            // Fallback for new users syncing
            dbUser = await this.prisma.user.findUnique({ where: { email: payload.email } });
        }
        
        if (dbUser) {
          request.user = { ...payload, ...dbUser, clerkId: clerkId };
        } else {
          request.user = { ...payload, id: clerkId, clerkId: clerkId };
        }
      } catch (jwtError) {
        this.logger.error('Authentication failed: ' + jwtError.message);
        if (!isPublic) throw new UnauthorizedException('Invalid or expired token');
      }
    } else if (!isPublic) {
      throw new UnauthorizedException('You have been logged out. Please log in again.');
    }

    return true;
  }
}
