import { Controller, Get, Query, Param, Post, Patch, Delete, Body, UseInterceptors, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { ProductService } from './products.service';
import { MigrationService } from './migration.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../auth/public.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly migrationService: MigrationService
  ) {}

  @Post('migration/start')
  @RequirePermission('products:write')
  async startMigration(
    @Body('shopUrl') shopUrl: string, 
    @Body('accessToken') accessToken: string
  ) {
    if (!shopUrl || !accessToken) throw new BadRequestException('shopUrl and accessToken are required');
    return this.migrationService.startMigration(shopUrl, accessToken);
  }

  @Get('migration/status')
  @RequirePermission('products:write')
  async getMigrationStatus() {
    return this.migrationService.getStatus();
  }
 
  @Get('migration/audit-collections')
  @RequirePermission('products:write')
  async auditCollections() {
    return this.migrationService.auditCollections();
  }
 
  @Post('migration/cleanup-collections')
  @RequirePermission('products:write')
  async cleanupCollections() {
    return this.migrationService.cleanupOrphanCollections();
  }

  @Post('migration/deep-reset')
  @RequirePermission('admin:all')
  async deepReset() {
    return this.migrationService.deepReset();
  }

  @Get()
  @Public()
  async findAll(
    @Query('ids') ids?: string | string[],
    @Query('type') type?: string,
    @Query('collection') collection?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('tags') tags?: string | string[],
    @Query('sizes') sizes?: string | string[],
    @Query('inStock') inStock?: string,
    @Query('combo') combo?: string,
    @Query('returnMeta') returnMeta?: string,
    @Query('sort') sort?: 'price_asc' | 'price_desc' | 'newest',
    @Query('adminMode') adminMode?: string,
  ) {
    const tagsArray = typeof tags === 'string' ? [tags] : tags;
    const sizesArray = typeof sizes === 'string' ? sizes.split(',') : sizes;
    const idsArray = typeof ids === 'string' ? ids.split(',') : ids;
    return this.productService.findAll({ 
      ids: idsArray,
      type, 
      collection, 
      search,
      limit, 
      page,
      minPrice, 
      maxPrice, 
      tags: tagsArray, 
      sizes: sizesArray,
      inStock: inStock === 'true',
      combo: combo === 'true',
      returnMeta: returnMeta === 'true',
      sort,
      adminMode: adminMode === 'true'
    });
  }

  @Get('related/:productId')
  @Public()
  async getRelated(@Param('productId') productId: string) {
    return this.productService.getRelatedProducts(productId);
  }

  @Get('collections')
  @Public()
  async getCollections(@Query('adminMode') adminMode?: string) {
    return this.productService.getCollections(adminMode === 'true');
  }

  @Get('admin/:id')
  @RequirePermission('products:read')
  async findAdminOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Get(':handle')
  @Public()
  async findOne(@Param('handle') handle: string) {
    return this.productService.findOne(handle);
  }

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('CSV file is required.');
    }
    return this.productService.processCsvBulkUpload(file.buffer);
  }

  @Post('bulk-action')
  @RequirePermission('products:write')
  async bulkAction(@Body() body: { action: string; productIds: string[]; data?: any }) {
    if (!body.action || !body.productIds) {
      throw new BadRequestException('action and productIds are required');
    }
    return this.productService.bulkAction(body.action, body.productIds, body.data);
  }

  @Post('bulk-update-items')
  @RequirePermission('products:write')
  async bulkUpdateItems(@Body('items') items: any[]) {
    if (!items || !Array.isArray(items)) throw new BadRequestException('Items array is required');
    return this.productService.bulkUpdateItems(items);
  }

  @Post('set-default-tax')
  @RequirePermission('products:write')
  async setDefaultTax(@Body() body: { taxRate?: number }) {
    return this.productService.setDefaultTax(body.taxRate ?? 5);
  }

  @Post()
  @RequirePermission('products:write')
  async create(@Body() data: any) {
    return this.productService.create(data);
  }

  @Patch(':id')
  @RequirePermission('products:write')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.productService.update(id, data);
  }

  @Post(':id/duplicate')
  @RequirePermission('products:write')
  async duplicate(@Param('id') id: string) {
    return this.productService.duplicate(id);
  }

  @Patch(':id/toggle-publish')
  @RequirePermission('products:write')
  async togglePublish(@Param('id') id: string) {
    return this.productService.togglePublish(id);
  }

  @Delete(':id')
  @RequirePermission('products:delete')
  async delete(@Param('id') id: string) {
    return this.productService.delete(id);
  }

  @Public()
  @Post('track-view')
  async trackView(@Body() body: { productId: string; userId?: string }) {
    if (body.userId && body.productId) {
       return this.productService.trackUserInterest(body.userId, body.productId);
    }
    return { success: true };
  }

  // ─── COLLECTIONS ──────────────────────────────────────────────────────────

  @Post('collections')
  @RequirePermission('products:write')
  async createCollection(@Body() data: any) {
    return this.productService.createCollection(data);
  }

  @Patch('collections/:id')
  @RequirePermission('products:write')
  async updateCollection(@Param('id') id: string, @Body() data: any) {
    if (id.startsWith('virtual-')) throw new BadRequestException('Cannot edit virtual collections');
    return this.productService.updateCollection(id, data);
  }

  @Delete('collections/:id')
  @RequirePermission('products:delete')
  async deleteCollection(@Param('id') id: string) {
    if (id.startsWith('virtual-')) throw new BadRequestException('Cannot delete virtual collections');
    return this.productService.deleteCollection(id);
  }

  @Get('collections/:id')
  @Public()
  async getCollectionWithProducts(@Param('id') id: string) {
    return this.productService.getCollectionWithProducts(id);
  }

  @Post('collections/:id/products')
  @RequirePermission('products:write')
  async addProductsToCollection(
    @Param('id') id: string,
    @Body('productIds') productIds: string[]
  ) {
    if (id.startsWith('virtual-')) throw new BadRequestException('Cannot manually add products to a virtual collection');
    return this.productService.addProductsToCollection(id, productIds);
  }

  @Delete('collections/:id/products/:productId')
  @RequirePermission('products:write')
  async removeProductFromCollection(
    @Param('id') id: string,
    @Param('productId') productId: string
  ) {
    if (id.startsWith('virtual-')) throw new BadRequestException('Cannot manually remove products from a virtual collection');
    return this.productService.removeProductFromCollection(id, productId);
  }
}
