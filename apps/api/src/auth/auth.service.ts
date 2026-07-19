import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { MailService } from '../mail/mail.service';
import { AuthOtpService } from './auth-otp.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
const bcrypt = require('bcryptjs');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private otpService: AuthOtpService,
    private eventEmitter: EventEmitter2,
  ) {
    this.googleClient = new OAuth2Client();
  }

  async login(email: string, pass: string) {
    const normalizedEmail = email.toLowerCase().trim();
    this.logger.log(`Attempting login for: ${normalizedEmail}`);
    
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      this.logger.warn(`Login failed: User ${normalizedEmail} not found in database`);
      throw new UnauthorizedException('Wrong email or password. Please try again.');
    }

    if (!user.password) {
      this.logger.warn(`Login failed: User ${normalizedEmail} has no password set (possibly Google-only)`);
      throw new UnauthorizedException('Wrong email or password. Please try again.');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      this.logger.warn(`Login failed: Incorrect password for ${normalizedEmail}`);
      throw new UnauthorizedException('Wrong email or password. Please try again.');
    }

    this.logger.log(`Login successful for: ${normalizedEmail}. Generating token...`);
    return this.generateToken(user);
  }

  private async generateToken(user: any) {
    // Fetch full user with permissions
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roleRef: {
          include: { permissions: true }
        }
      }
    });

    if (!dbUser) {
      throw new UnauthorizedException("We can't find an account with this email.");
    }

    const permissions = dbUser?.roleRef?.permissions?.map(p => p.action) || [];
    const payload = { sub: user.id, email: user.email, role: user.role, permissions };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        permissions 
      },
    };
  }

  async seedAdmin(email: string, pass: string) {
    const hashedPassword = await bcrypt.hash(pass, 10);
    return this.prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: { password: hashedPassword, role: 'ADMIN' },
      create: { email: email.toLowerCase(), password: hashedPassword, role: 'ADMIN' },
    });
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    this.logger.log(`Forgot password requested for ${normalizedEmail}`);
    
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      // Return success to prevent email enumeration
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetExpires: expires },
    });

    await this.mailService.sendPasswordResetEmail(normalizedEmail, token);
    return { success: true };
  }

  async resetPassword(token: string, newPass: string) {
    this.logger.log(`Password reset attempt with token`);
    
    const user = await this.prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user || !user.resetExpires || user.resetExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashed,
        resetToken: null,
        resetExpires: null
      }
    });

    return { success: true };
  }

  async sendOtp(email: string, referredByCode?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    this.logger.log(`Generating OTP for ${normalizedEmail}`);
    
    // 1. Ensure user exists or create them
    let user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { email: normalizedEmail, role: 'CUSTOMER', name: normalizedEmail.split('@')[0] }
      });
      // Attach the referral code so growth.service can track it
      this.eventEmitter.emit('user.created', { ...user, referredByCode });
    }

    // 2. Generate Code
    let code = await this.otpService.generateOtp(normalizedEmail);
    
    // 3. Development Bypass for Live Testing
    if (normalizedEmail === 'customer@example.com') {
      code = '1234';
      this.logger.warn(`BYPASS: Using 1234 for customer@example.com`);
    }

    // 4. Send Email
    await this.mailService.sendOtpEmail(normalizedEmail, code);
    return { success: true };
  }

  async verifyOtpAndLogin(email: string, code: string) {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Development Bypass Check
    const isBypass = normalizedEmail === 'customer@example.com' && code === '1234';
    const isValid = isBypass || await this.otpService.verifyOtp(normalizedEmail, code);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) throw new UnauthorizedException("We can't find an account with this email.");

    return this.generateToken(user);
  }
  async googleLogin(idToken: string, referredByCode?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    this.logger.log(`Google verification started... (ClientID present: ${!!clientId})`);
    
    try {
      if (!clientId) {
        throw new Error("GOOGLE_CLIENT_ID is missing in backend environment.");
      }
      
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        this.logger.error(`❌ Google Payload Invalid. Audience: ${payload?.aud}, Expected: ${clientId}`);
        throw new UnauthorizedException('Invalid Google token payload');
      }

      // Final sanity check for audience
      if (payload.aud !== clientId) {
        this.logger.error(`❌ Audience Mismatch: Got ${payload.aud}, Expected ${clientId}`);
        throw new UnauthorizedException('Google Client ID mismatch');
      }

      this.logger.log(`✅ Google Token Verified for: ${payload.email} (Audience: ${payload.aud})`);

      const normalizedEmail = payload.email.toLowerCase().trim();
      let user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        // Create user if they don't exist
        user = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            name: payload.name || normalizedEmail.split('@')[0],
            role: 'CUSTOMER',
          },
        });
        // Attach the referral code so growth.service can track it
        this.eventEmitter.emit('user.created', { ...user, referredByCode });
        this.logger.log(`🆕 Created new user via Google: ${normalizedEmail}`);
      }

      return this.generateToken(user);
    } catch (error) {
      this.logger.error(`❌ Google Login Error: ${error.message}`);
      if (error.stack) this.logger.debug(error.stack);
      
      if (error.message.includes('audience') || error.message.includes('mismatch')) {
        throw new UnauthorizedException(`Google Client ID mismatch. Backend Client ID: ${clientId?.substring(0, 10)}...`);
      }
      
      throw new UnauthorizedException(`Google authentication failed: ${error.message}`);
    }
  }
  async syncUserWithClerk(user: any) { return { success: true }; }
  async setAdminRole(id: string) { return { success: true }; }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleRef: {
          include: { permissions: true }
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            items: {
              include: {
                variant: {
                  include: { product: { include: { images: true } } }
                }
              }
            },
            fulfillments: {
              include: {
                shipments: true
              }
            }
          }
        }
      }
    });

    if (!user) throw new UnauthorizedException('User not found');

    const permissions = user.roleRef?.permissions?.map(p => p.action) || [];
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions,
      orders: user.orders,
      savedAddresses: user.savedAddresses,
    };
  }

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    if (user.password) {
      // If the user already has a password, verify the current one
      const isMatch = await bcrypt.compare(currentPass, user.password);
      if (!isMatch) throw new BadRequestException('Your current password is wrong.');
    }
    // If user.password is null (logged in via OTP/Google), allow them to set one directly

    const hashed = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed }
    });

    return { success: true };
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; savedAddresses?: any[] }) {
    if (data.email) {
      const normalizedEmail = data.email.toLowerCase().trim();
      const existing = await this.prisma.user.findFirst({
        where: { 
          email: normalizedEmail,
          id: { not: userId }
        }
      });
      if (existing) throw new BadRequestException('This email is already taken. Please log in.');
      data.email = normalizedEmail;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        ...(data.savedAddresses !== undefined && { savedAddresses: data.savedAddresses })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        savedAddresses: true
      }
    });
  }
}
