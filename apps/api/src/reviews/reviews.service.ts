import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async getModerationQueue() {
    return this.prisma.review.findMany({
      include: {
        product: {
          select: { id: true, title: true, handle: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        images: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async moderateReview(id: string, approved: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.update({
      where: { id },
      data: { approved }
    });
  }

  async deleteReview(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.delete({ where: { id } });
  }

  async getProductReviews(productId: string) {
    return this.prisma.review.findMany({
      where: { productId, approved: true },
      include: {
        user: { select: { name: true } },
        images: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createReview(data: any, userId: string) {
    if (!data.productId) {
      throw new BadRequestException('Product ID is required');
    }

    const hasPurchased = await this.prisma.orderItem.findFirst({
      where: {
        variant: {
          productId: data.productId
        },
        order: {
          userId: userId,
          status: {
            in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
          }
        }
      }
    });

    if (!hasPurchased) {
      throw new BadRequestException('You can only review products you have purchased.');
    }

    return this.prisma.review.create({
      data: {
        rating: data.rating,
        headline: data.headline,
        content: data.content,
        productId: data.productId,
        userId: userId,
        approved: false, // Default to pending moderation
      }
    });
  }

  async checkEligibility(productId: string, userId: string) {
    const hasPurchased = await this.prisma.orderItem.findFirst({
      where: {
        variant: {
          productId: productId
        },
        order: {
          userId: userId,
          status: {
            in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
          }
        }
      }
    });
    return !!hasPurchased;
  }
}
