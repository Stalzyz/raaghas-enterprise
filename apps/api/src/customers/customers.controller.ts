import { Controller, Get, Patch, Body, UseGuards, Query, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('customers')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'MARKETING', 'OPERATIONS', 'FINANCE', 'ACCOUNTANT')
export class CustomersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query('role') role?: string) {
    const where: any = { role: 'CUSTOMER' };
    if (role && role !== 'ALL') {
      where.role = role;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        lastActiveAt: true,
        interests: true,
        createdAt: true,
        updatedAt: true,
        wallet: { select: { id: true, balance: true } },
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('prospects')
  async findProspects() {
    return this.prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        orders: { none: {} }
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        lastActiveAt: true,
        interests: true,
        createdAt: true,
        wallet: { select: { id: true, balance: true } },
        _count: {
          select: { reviews: true, WishlistItem: true }
        }
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { phone?: string; name?: string }) {
    const data: any = {};
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.name !== undefined) data.name = body.name;
    return this.prisma.user.update({ where: { id }, data });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const customer = await this.prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                variant: {
                  include: { product: true }
                }
              }
            }
          }
        },
        reviews: true,
        WishlistItem: {
          include: {
            product: true
          }
        },
        wallet: true
      }
    });
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    return customer;
  }
}
