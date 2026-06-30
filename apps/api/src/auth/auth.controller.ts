import { Controller, Post, Body, Headers, UnauthorizedException, Logger, Get, UseGuards, Req, Patch, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { AuthGuard } from './auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  private setTokenCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      domain: isProd ? '.raaghas.in' : undefined,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('otp/send')
  async sendOtp(@Body() body: { email: string; referredByCode?: string }) {
    this.logger.log(`OTP requested for ${body.email}`);
    await this.authService.sendOtp(body.email, body.referredByCode);
    return { success: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('otp/verify')
  async verifyOtp(@Body() body: { email: string; code: string }, @Res({ passthrough: true }) res: Response) {
    this.logger.log(`OTP verification attempt for ${body.email}`);
    const data = await this.authService.verifyOtpAndLogin(body.email, body.code);
    this.setTokenCookie(res, data.access_token);
    return data;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('google')
  async googleLogin(@Body() body: { token: string; referredByCode?: string }, @Res({ passthrough: true }) res: Response) {
    this.logger.log(`Google login attempt`);
    const data = await this.authService.googleLogin(body.token, body.referredByCode);
    this.setTokenCookie(res, data.access_token);
    return data;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(@Body() body: { email: string; pass: string }, @Res({ passthrough: true }) res: Response) {
    this.logger.log(`Credential login attempt for ${body.email}`);
    const data = await this.authService.login(body.email, body.pass);
    this.setTokenCookie(res, data.access_token);
    return data;
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    this.logger.log(`Forgot password requested for ${body.email}`);
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; pass: string }) {
    this.logger.log(`Password reset attempt with token`);
    return this.authService.resetPassword(body.token, body.pass);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    this.logger.log(`Logout requested`);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('admin_token', '', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      domain: isProd ? '.raaghas.in' : undefined,
      expires: new Date(0) // Expire immediately
    });
    return { success: true };
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    this.logger.log(`Password change requested for ${req.user.email}`);
    return this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  @Public()
  @Post('seed-admin')
  async seedAdmin(@Body() body: { email: string; pass: string; secret: string }) {
    if (!process.env.ADMIN_SEED_SECRET || body.secret !== process.env.ADMIN_SEED_SECRET) {
      this.logger.error(`Unauthorized seed-admin attempt for: ${body.email}`);
      throw new UnauthorizedException('Invalid seed secret');
    }
    this.logger.log(`Seeding admin user: ${body.email}`);
    await this.authService.seedAdmin(body.email, body.pass);
    return { success: true };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    const user = await this.authService.getUserProfile(req.user.id);
    
    // Extract the token that the AuthGuard verified (from Bearer or Cookie)
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      const cookieHeader = req.headers.cookie || '';
      const cookieMatch = cookieHeader
        .split(';')
        .map((c: string) => c.trim())
        .find((c: string) => c.startsWith('admin_token='));
      if (cookieMatch) token = cookieMatch.split('=')[1];
    }
    
    return { user, access_token: token };
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  async updateMe(@Req() req: any, @Body() data: { name?: string; email?: string; savedAddresses?: any[] }) {
    return this.authService.updateProfile(req.user.id, data);
  }
}
