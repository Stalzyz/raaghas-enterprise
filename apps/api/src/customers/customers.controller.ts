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
  async findAll(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const where: any = {};
    if (role && role !== 'ALL') {
      where.role = role;
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, parseInt(pageStr || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(limitStr || '50', 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
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
        skip: pageStr || limitStr ? skip : undefined,
        take: pageStr || limitStr ? limit : undefined,
      }),
      this.prisma.user.count({ where }),
    ]);

    if (pageStr || limitStr || search) {
      return {
        data: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    return items;
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
