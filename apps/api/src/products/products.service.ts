import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];

function sortVariants(variants: any[]) {
  if (!variants || !Array.isArray(variants)) return variants;
  return variants.sort((a, b) => {
    const sizeA = (a.option1Name?.toLowerCase() === 'size') ? a.option1Value : 
                  ((a.option2Name?.toLowerCase() === 'size') ? a.option2Value : a.option1Value);
    const sizeB = (b.option1Name?.toLowerCase() === 'size') ? b.option1Value : 
                  ((b.option2Name?.toLowerCase() === 'size') ? b.option2Value : b.option1Value);
    
    let indexA = SIZE_ORDER.indexOf(sizeA);
    let indexB = SIZE_ORDER.indexOf(sizeB);
    
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;
    
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return 0;
  });
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private prisma: PrismaService,
  ) {}



  async findAll(query: { 
    ids?: string[];
    type?: string; 
    collection?: string; 
    search?: string;
    limit?: number;
    page?: number;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    sizes?: string[];
    inStock?: boolean;
    combo?: boolean;
    returnMeta?: boolean;
    sort?: 'price_asc' | 'price_desc' | 'newest';
    adminMode?: boolean;
    fabric?: string;
    material?: string;
    occasion?: string;
    style?: string;
    gender?: string;
    ageGroup?: string;
  }) {
    try {
      const { ids, type, collection, search, limit: rawLimit, page: rawPage, minPrice, maxPrice, tags, sizes, inStock, combo, returnMeta, sort, adminMode } = query;
      
      // Fix: enforce a default limit of 50 to prevent OOM.
      const limit = rawLimit ? Number(rawLimit) : 50;
      const page = rawPage ? Number(rawPage) : 1;
      const skip = (page > 0) ? (page - 1) * limit : 0;
      
      // Build the "where" clause
      const where: any = {
        published: adminMode ? undefined : true,
        status: adminMode ? undefined : 'ACTIVE',
        ...(ids && ids.length > 0 && { id: { in: ids } }),
        ...(search && {
          AND: search.split(' ').filter(Boolean).map(term => ({
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { handle: { contains: term, mode: 'insensitive' } },
              { category: { contains: term, mode: 'insensitive' } },
              { tags: { contains: term, mode: 'insensitive' } },
              { searchKeywords: { contains: term, mode: 'insensitive' } },
              { collections: { some: { title: { contains: term, mode: 'insensitive' } } } },
              { variants: { some: { sku: { contains: term, mode: 'insensitive' } } } },
            ]
          }))
        }),
        ...(type && { category: type }), // legacy support
        ...(query.fabric && { fabric: query.fabric }),
        ...(query.material && { material: query.material }),
        ...(query.occasion && { occasion: query.occasion }),
        ...(query.style && { style: query.style }),
        ...(query.gender && { gender: query.gender }),
        ...(query.ageGroup && { ageGroup: query.ageGroup }),
      };

      if (collection && collection !== 'all') {
        const collectionCondition = {
          OR: [
            { collections: { some: { handle: { equals: collection, mode: 'insensitive' } } } },
            { category: { equals: collection.replace(/-/g, ' '), mode: 'insensitive' } },
            { category: { equals: collection, mode: 'insensitive' } }
          ]
        };
        
        if (where.OR) {
          where.AND = [{ OR: where.OR }, collectionCondition];
          delete where.OR;
        } else {
          where.OR = collectionCondition.OR;
        }
      }

      // Fix: tags is a string in schema, not an array. Use contains for each tag.
      if (tags && Array.isArray(tags) && tags.length > 0) {
        where.AND = [
          ...(where.AND || []),
          { OR: tags.map(tag => ({ tags: { contains: tag, mode: 'insensitive' } })) }
        ];
      }
      
      if (combo) {
        where.AND = [
          ...(where.AND || []),
          { tags: { contains: 'combo', mode: 'insensitive' } }
        ];
      }

      let variantConditions: any[] = [];
      if (typeof minPrice !== 'undefined' || typeof maxPrice !== 'undefined') {
        variantConditions.push({
          price: {
            gte: minPrice !== undefined ? Number(minPrice) : undefined,
            lte: maxPrice !== undefined ? Number(maxPrice) : undefined,
          }
        });
      }
      if (sizes && sizes.length > 0) {
        variantConditions.push({
          OR: sizes.flatMap(size => [
            { option1Value: { equals: size, mode: 'insensitive' } },
            { option1Value: { startsWith: `${size}-`, mode: 'insensitive' } },
            { option1Value: { startsWith: `${size} -`, mode: 'insensitive' } },
            { option2Value: { equals: size, mode: 'insensitive' } },
            { option2Value: { startsWith: `${size}-`, mode: 'insensitive' } },
            { option2Value: { startsWith: `${size} -`, mode: 'insensitive' } },
            { option3Value: { equals: size, mode: 'insensitive' } },
            { option3Value: { startsWith: `${size}-`, mode: 'insensitive' } },
            { option3Value: { startsWith: `${size} -`, mode: 'insensitive' } }
          ])
        });
      }
      if (inStock) {
        variantConditions.push({ inventory: { gt: 0 } });
      }

      if (variantConditions.length > 0) {
        where.variants = { some: { AND: variantConditions } };
      }

      // Build sort
      let orderBy: any = { createdAt: 'desc' };
      const sortMapping: Record<string, any> = {
        'newest': { createdAt: 'desc' },
        'oldest': { createdAt: 'asc' },
        'alphabetical': { title: 'asc' },
      };

      if (sort && sortMapping[sort]) {
        orderBy = sortMapping[sort];
      }

      // If returning meta, fetch total count
      let total = 0;
      let totalPages = 1;
      if (returnMeta) {
        total = await this.prisma.product.count({ where });
        totalPages = limit ? Math.ceil(total / Number(limit)) : 1;
      }

      let products;
      
      if (sort === 'price_asc' || sort === 'price_desc') {
        // Prisma doesn't support ordering by one-to-many relational aggregates (like min price)
        // Fetch all matching products, sort in memory, and paginate
        const allProducts = await this.prisma.product.findMany({
          where,
          take: 1000, // HARD CAP: Prevents entire database from loading into memory during JS sort.
          include: {
            variants: { include: { reservations: true } },
            images: { orderBy: { position: 'asc' } },
            collections: true,
          },
        });
        
        allProducts.sort((a, b) => {
          const priceA = a.variants.length > 0 ? Math.min(...a.variants.map(v => Number(v.price) || 0)) : 0;
          const priceB = b.variants.length > 0 ? Math.min(...b.variants.map(v => Number(v.price) || 0)) : 0;
          return sort === 'price_asc' ? priceA - priceB : priceB - priceA;
        });
        
        products = allProducts.slice(skip, skip + limit);
      } else {
        products = await this.prisma.product.findMany({
          where,
          include: {
            variants: { include: { reservations: true } },
            images: { orderBy: { position: 'asc' } },
            collections: true,
          },
          orderBy,
          skip,
          take: limit,
        });
      }

      const data = products.map((product) => ({
        ...product,
        variants: sortVariants(product.variants.map((v: any) => {
          const reserved = (v.reservations || []).reduce((sum: number, r: any) => sum + r.quantity, 0);
          return { ...v, inventory: v.inventory - reserved };
        })),
        rating: 0,
        reviewsCount: 0
      }));

      // Stable sort: push out-of-stock to the bottom while preserving DB ordering within each group
      data.sort((a, b) => {
        const aStock = a.variants.reduce((sum: number, v: any) => sum + Math.max(0, v.inventory), 0);
        const bStock = b.variants.reduce((sum: number, v: any) => sum + Math.max(0, v.inventory), 0);
        const aOOS = aStock <= 0 ? 1 : 0;
        const bOOS = bStock <= 0 ? 1 : 0;
        if (aOOS !== bOOS) return aOOS - bOOS; // out-of-stock goes last
        // Same stock status → preserve DB ordering (already sorted by orderBy)
        return 0;
      });
      
      if (returnMeta) {
        return { data, meta: { total, totalPages, page: page || 1 } };
      }
      
      return data;
    } catch (error) {
      console.error("[ProductService.findAll] Error:", error);
      throw error;
    }
  }

  async getRelatedProducts(productId: string, limit: number = 4) {
    const product = await (this.prisma as any).product.findUnique({
      where: { id: productId },
      include: { collections: { take: 1 } }
    });

    if (!product) return [];

    const collectionHandle = product.collections[0]?.handle;

    const related = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        published: true,
        OR: [
          { category: product.category || undefined },
          { collections: collectionHandle ? { some: { handle: collectionHandle } } : undefined }
        ]
      },
      include: {
        variants: { include: { reservations: true } },
        images: { orderBy: { position: 'asc' } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return related.map((p) => {
      return { 
        ...p, 
        variants: sortVariants(p.variants.map((v: any) => {
          const reserved = (v.reservations || []).reduce((sum: number, r: any) => sum + r.quantity, 0);
          return { ...v, inventory: v.inventory - reserved };
        })),
        rating: 0, 
        reviewsCount: 0 
      };
    });
  }

  async findOne(identifier: string) {
    const product = await (this.prisma as any).product.findFirst({
      where: {
        OR: [
          { id: identifier },
          { handle: identifier }
        ]
      },
      include: {
        variants: { include: { reservations: true } },
        images: { orderBy: { position: 'asc' } },
        collections: true,
        sizeGuide: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with identifier ${identifier} not found`);
    }

    return { 
      ...product, 
      variants: sortVariants(product.variants.map((v: any) => {
        const reserved = (v.reservations || []).reduce((sum: number, r: any) => sum + r.quantity, 0);
        return { ...v, inventory: v.inventory - reserved };
      })),
      bundleProducts: [], // bundleIds removed from schema
      rating: 0, 
      reviewsCount: 0 
    };
  }

  async getCollections(adminMode = false) {
    const dbCollections = await (this.prisma as any).collection.findMany({
      include: {
        _count: {
          select: { products: adminMode ? true : { where: { published: true, status: 'ACTIVE' } } },
        },
      },
    });

    const distinctCategories = await this.prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { published: true, category: { not: null, notIn: ['Uncategorized', ''] } }
    });

    const virtualCollections = distinctCategories.map((t: any) => ({
      id: `virtual-${t.category}`,
      handle: t.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      title: t.category,
      isVirtual: true,
      _count: { products: 1 } 
    }));

    return [...dbCollections, ...virtualCollections];
  }



  async processCsvBulkUpload(buffer: Buffer) {
    const Papa = require('papaparse');

    // ─── Helpers ────────────────────────────────────────────────────────────────
    const parseNum = (val: any, defaultVal: any = 0) => {
      if (val === undefined || val === null || val === '') return defaultVal;
      const parsed = Number(val.toString().replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? defaultVal : parsed;
    };

    // BUG-9 FIX: Normalize image URLs — relative /uploads/ paths get absolute URL
    const publicApiBase = process.env.API_URL 
      ? process.env.API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
      : (process.env.NODE_ENV === 'production' ? 'https://api.raaghas.in' : 'http://localhost:6005');

    const normalizeImageUrl = (url: string | null | undefined): string | null => {
      if (!url || !url.trim()) return null;
      const trimmed = url.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      if (trimmed.startsWith('/uploads/')) return `${publicApiBase}${trimmed}`;
      // Unknown format — still store as-is, frontend getAssetUrl will handle
      return trimmed;
    };

    // ─── Parse CSV ───────────────────────────────────────────────────────────────
    let csvString = buffer.toString('utf-8');

    // Remove BOM if present (common in Excel/Shopify exports)
    if (csvString.charCodeAt(0) === 0xFEFF) {
      csvString = csvString.slice(1);
    }

    const parsed = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (parsed.errors.length > 0) {
      console.warn('CSV Parse Warnings:', parsed.errors);
      if (parsed.data.length === 0) {
        return {
          success: false,
          message: `CSV Parsing failed on line ${parsed.errors[0].row}: ${parsed.errors[0].message}`,
          summary: { success: 0, updated: 0, failed: 1, errors: [{ key: 'CSV_PARSE_ERROR', error: parsed.errors[0].message }] }
        };
      }
    }

    let rows = parsed.data as any[];

    if (rows.length === 0) {
      return {
        success: false,
        message: 'CSV file is empty or contains only headers.',
        summary: { success: 0, updated: 0, failed: 0, errors: [] }
      };
    }

    // ─── Row Normalization ───────────────────────────────────────────────────────
    rows = rows.map((row: any) => {
      const title = (row.Title || row.Name || '').toString().trim();
      let handle = (row.Handle || '').toString().trim();

      // Auto-generate Handle if missing, based on Title
      if (!handle && title) {
        handle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      }

      return { ...row, Title: title, Handle: handle };
    });

    const summary = { success: 0, updated: 0, failed: 0, errors: [] as {key: string, error: string}[] };

    // ─── Group rows by Product Identifier ────────────────────────────────────────
    const productGroups = new Map<string, any[]>();
    let lastKey: string | null = null;

    for (const row of rows) {
      let key = (row.Product_ID || row.Handle || '').toString().trim();

      if (!key) {
        if (lastKey) {
          key = lastKey; // Inherit from previous product (variant row)
        } else if (row.Name || row.Title) {
          key = (row.Name || row.Title).toString().trim();
          lastKey = key;
        }
      } else {
        lastKey = key;
      }

      if (!key) continue;

      if (!productGroups.has(key)) productGroups.set(key, []);
      productGroups.get(key)!.push(row);
    }

    // ─── Process each Product Group ───────────────────────────────────────────────
    for (const [key, productRows] of productGroups.entries()) {
      try {
        // BUG-3 FIX: Extend transaction timeout to 30s for products with many variants
        await (this.prisma as any).$transaction(async (tx: any) => {
          const firstRow = productRows[0];
          const title = (firstRow.Name || firstRow.Title || `Product ${key}`).toString().trim();
          const handle = (firstRow.Handle || title).toString().toLowerCase()
            .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

          // ── 1. Find or Create Product ──────────────────────────────────────────
          // BUG-6 FIX: Removed the redundant collision check. findFirst by handle is
          // already sufficient. The previous "collision" branch was unreachable in normal
          // cases and caused random handles on race conditions.
          let product = await tx.product.findFirst({ where: { handle } });

          // ── 1a. Size Guide Lookup ──────────────────────────────────────────────
          let sizeGuideId: string | undefined = undefined;
          if (firstRow.Size_Guide?.toString().trim()) {
            const guide = await tx.sizeGuide.findFirst({
              where: { name: { equals: firstRow.Size_Guide.toString().trim(), mode: 'insensitive' } }
            });
            if (guide) sizeGuideId = guide.id;
          }

          // ── 1b. Collections Auto-sync ──────────────────────────────────────────
          const collectionTitles = new Set<string>();
          if (firstRow.Category?.toString().trim()) collectionTitles.add(firstRow.Category.toString().trim());
          if (firstRow['Product Category']?.toString().trim()) collectionTitles.add(firstRow['Product Category'].toString().trim());
          if (firstRow.Type?.toString().trim()) collectionTitles.add(firstRow.Type.toString().trim());
          if (firstRow.Collection?.toString().trim()) {
            firstRow.Collection.toString().split(',')
              .map((c: string) => c.trim()).filter(Boolean)
              .forEach((c: string) => collectionTitles.add(c));
          }

          const collectionIds: { id: string }[] = [];
          for (const cTitle of collectionTitles) {
            if (!cTitle || cTitle.toLowerCase() === 'general') continue;
            const collHandle = cTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            let dbColl = await tx.collection.findFirst({
              where: { OR: [{ handle: collHandle }, { title: { equals: cTitle, mode: 'insensitive' } }] }
            });
            if (!dbColl) {
              try {
                dbColl = await tx.collection.create({ data: { title: cTitle, handle: collHandle } });
              } catch {
                // Race condition: collection was created by another concurrent transaction
                dbColl = await tx.collection.findFirst({ where: { handle: collHandle } });
              }
            }
            if (dbColl) collectionIds.push({ id: dbColl.id });
          }

          // ── 1c. Status/Published parsing (BUG-7 FIX) ──────────────────────────
          // Clear, unambiguous status parsing replaces the broken ternary chain
          let rawStatus: 'ACTIVE' | 'DRAFT' = 'DRAFT';
          const statusCol = firstRow.Status?.toString().trim().toUpperCase();
          const publishedCol = firstRow.Published?.toString().trim().toLowerCase();

          if (statusCol === 'ACTIVE' || statusCol === 'PUBLISHED' || statusCol === 'TRUE') {
            rawStatus = 'ACTIVE';
          } else if (!statusCol && (publishedCol === 'true' || publishedCol === '1' || publishedCol === 'yes')) {
            rawStatus = 'ACTIVE';
          }
          const isPublished = rawStatus === 'ACTIVE';

          // ── 1d. Tax Rate & Inclusive ───────────────────────────────────────────
          const taxRateRaw = firstRow.Tax_Rate?.toString().trim().replace(/[^0-9.]/g, '');
          const taxRate = taxRateRaw ? (Number(taxRateRaw) || undefined) : undefined;
          const taxInclusiveRaw = firstRow.Tax_Inclusive?.toString().trim().toUpperCase();
          const taxInclusive = taxInclusiveRaw ? taxInclusiveRaw === 'TRUE' : undefined;

          const productPayload: any = {
            title,
            handle,
            description: (firstRow.Description || firstRow.Long_Description || firstRow['Body (HTML)'] || '').toString(),
            category: (firstRow.Category || firstRow['Product Category'] || firstRow['Product Type'] || firstRow.Type || firstRow.Product_Type || 'General').toString().trim(),
            subCategory: firstRow.Sub_Category?.toString().trim() || '',
            brand: (firstRow.Brand || firstRow.Vendor || 'Raaghas').toString().trim(),
            collection: firstRow.Collection?.toString().trim() || '',
            productType: (firstRow.Product_Type || firstRow.Type || 'Apparel').toString().trim(),
            gender: firstRow.Gender?.toString().trim() || 'Unisex',
            ageGroup: firstRow.Age_Group?.toString().trim() || 'Adult',
            fabric: firstRow.Fabric?.toString().trim() || '',
            material: firstRow.Material?.toString().trim() || '',
            pattern: firstRow.Pattern?.toString().trim() || '',
            fitType: firstRow.Fit_Type?.toString().trim() || '',
            sleeveType: firstRow.Sleeve_Type?.toString().trim() || '',
            neckType: firstRow.Neck_Type?.toString().trim() || '',
            length: firstRow.Length?.toString().trim() || '',
            occasion: firstRow.Occasion?.toString().trim() || '',
            style: firstRow.Style?.toString().trim() || '',
            tags: firstRow.Tags?.toString().trim() || '',
            searchKeywords: firstRow.Search_Keywords?.toString().trim() || firstRow.Tags?.toString().trim() || '',
            seoTitle: firstRow.SEO_Title?.toString().trim() || title,
            metaDescription: firstRow.Meta_Description?.toString().trim() || '',
            metaKeywords: firstRow.Meta_Keywords?.toString().trim() || firstRow.Tags?.toString().trim() || '',
            hsnCode: firstRow.HSN_Code?.toString().trim() || 'TEXTILE-00',
            taxRate,
            taxInclusive,
            status: rawStatus,
            published: isPublished,
          };

          // Remove undefined values so Prisma schema defaults apply on create
          Object.keys(productPayload).forEach(k => productPayload[k] === undefined && delete productPayload[k]);

          if (sizeGuideId) productPayload.sizeGuideId = sizeGuideId;
          if (collectionIds.length > 0) productPayload.collections = { connect: collectionIds };

          if (product) {
            product = await tx.product.update({ where: { id: product.id }, data: productPayload });
            summary.updated++;
          } else {
            product = await tx.product.create({ data: productPayload });
            summary.success++;
          }

          // ── 2. Process Variants ────────────────────────────────────────────────
          const baseSku = firstRow.SKU?.toString().trim() || firstRow['Variant SKU']?.toString().trim() || product.handle;

          for (const vRow of productRows) {
            let sku = vRow.SKU?.toString().trim() || vRow['Variant SKU']?.toString().trim();
            if (!sku) {
              // Fallback: auto-generate SKU from base + options
              const optionsStr = [
                vRow['Option1 Value']?.toString().trim() || vRow.Size?.toString().trim(),
                vRow['Option2 Value']?.toString().trim() || vRow.Color?.toString().trim(),
                vRow['Option3 Value']?.toString().trim() || vRow.Secondary_Color?.toString().trim(),
              ].filter(Boolean).join('-');
              sku = `${baseSku}-${(optionsStr || 'base').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            }

            // BUG-2 FIX: Normalize empty/whitespace barcodes to null to prevent @unique violation
            const rawBarcode = vRow.Barcode?.toString().trim() || vRow['Variant Barcode']?.toString().trim() || null;
            const barcode = rawBarcode && rawBarcode.length > 0 ? rawBarcode : null;

            // BUG-8 FIX: Only set option2/option3 if a real value was provided.
            // Defaulting to "Default" when the CSV has no Color column pollutes the variant options UI.
            const opt1Val = vRow['Option1 Value']?.toString().trim() || vRow.Size?.toString().trim() || 'Default';
            const opt2Val = vRow['Option2 Value']?.toString().trim() || vRow.Color?.toString().trim() || null;
            const opt3Val = vRow['Option3 Value']?.toString().trim() || vRow.Secondary_Color?.toString().trim() || null;

            const variantPayload: any = {
              sku,
              barcode,
              price: parseNum(vRow.Selling_Price || vRow.Price || vRow['Variant Price'], 0),
              mrp: parseNum(vRow.MRP || vRow.Selling_Price || vRow.Price || vRow['Variant Compare At Price'] || vRow['Variant Price'], 0),
              sellingPrice: parseNum(vRow.Selling_Price || vRow.Price || vRow['Variant Price'], 0),
              offerPrice: vRow.Offer_Price ? parseNum(vRow.Offer_Price, null) : null,
              costPrice: vRow.Cost_Price ? parseNum(vRow.Cost_Price, null) : null,
              discountPercentage: vRow.Discount_Percent ? parseNum(vRow.Discount_Percent, null) : null,
              inventory: parseNum(vRow.Stock_Qty || vRow.Stock || vRow['Variant Inventory Qty'] || vRow.Inventory, 0),
              option1Name: vRow['Option1 Name']?.toString().trim() || 'Size',
              option1Value: opt1Val,
              option2Name: opt2Val ? (vRow['Option2 Name']?.toString().trim() || 'Color') : null,
              option2Value: opt2Val,
              option3Name: opt3Val ? (vRow['Option3 Name']?.toString().trim() || 'Secondary Color') : null,
              option3Value: opt3Val,
              productId: product.id,
            };

            // BUG-1 FIX: Check if this SKU belongs to a DIFFERENT product — cross-product SKU collision.
            const existingVariant = await tx.variant.findUnique({ where: { sku } });
            if (existingVariant) {
              if (existingVariant.productId !== product.id) {
                // SKU collision: this SKU was previously assigned to another product.
                // Generate a disambiguated SKU rather than silently corrupting the other product.
                const disambiguatedSku = `${sku}-${product.handle.slice(-6)}`;
                variantPayload.sku = disambiguatedSku;
                await tx.variant.create({ data: variantPayload });
                summary.errors.push({ key, error: `SKU "${sku}" collision: renamed to "${disambiguatedSku}" for this product.` });
              } else {
                // Same product — safe update
                await tx.variant.update({ where: { id: existingVariant.id }, data: variantPayload });
              }
            } else {
              await tx.variant.create({ data: variantPayload });
            }
          }

          // ── 3. Process Media ───────────────────────────────────────────────────
          const rawImages: (string | null)[] = [
            normalizeImageUrl(firstRow.Main_Image),
            normalizeImageUrl(firstRow.Image_2),
            normalizeImageUrl(firstRow.Image_3),
            normalizeImageUrl(firstRow.Image_4),
            normalizeImageUrl(firstRow.Image_5),
          ];

          // Deduplicate and remove nulls
          const seenUrls = new Set<string>();
          const images: { url: string; position: number }[] = [];
          for (const url of rawImages) {
            if (url && !seenUrls.has(url)) {
              seenUrls.add(url);
              images.push({ url, position: images.length });
            }
          }

          // Shopify 'Image Src' column across all variant rows
          for (const r of productRows) {
            const imgSrc = normalizeImageUrl(r['Image Src']);
            if (imgSrc && !seenUrls.has(imgSrc)) {
              // Shopify Image Position is 1-indexed; convert to 0-indexed
              const pos = r['Image Position'] ? Math.max(0, Number(r['Image Position']) - 1) : images.length;
              images.push({ url: imgSrc, position: pos });
              seenUrls.add(imgSrc);
            }
          }

          if (images.length > 0) {
            // Re-normalize positions to 0-indexed sequential to guarantee correct thumbnail order
            const finalImages = images
              .sort((a, b) => a.position - b.position)
              .map((img, idx) => ({
                url: img.url,
                position: idx,
                productId: product.id,
                altText: idx === 0 ? title : `${title} - ${idx + 1}`,
              }));

            await tx.image.deleteMany({ where: { productId: product.id } });
            await tx.image.createMany({ data: finalImages });
          }

        }, { timeout: 30000 }); // BUG-3 FIX: 30s transaction timeout for large products
      } catch (err: any) {
        summary.failed++;
        const errMsg = err?.message || String(err);
        // Surface specific Prisma error codes for better debugging
        if (err?.code === 'P2002') {
          const field = err?.meta?.target?.join(', ') || 'unknown field';
          summary.errors.push({ key, error: `Unique constraint violation on [${field}]. Check for duplicate SKU or barcode in your CSV.` });
        } else if (err?.code === 'P2025') {
          summary.errors.push({ key, error: `Record not found during update. The product may have been deleted. Re-upload to recreate.` });
        } else if (errMsg.includes('Transaction already closed') || errMsg.includes('timed out')) {
          summary.errors.push({ key, error: `Transaction timeout: this product has too many variants or images. Try splitting into smaller batches.` });
        } else {
          summary.errors.push({ key, error: errMsg });
        }
      }
    }

    const hasErrors = summary.errors.length > 0;
    return {
      success: true,
      message: `Import complete: ${summary.success} created, ${summary.updated} updated, ${summary.failed} failed.${hasErrors ? ` See error log for ${summary.errors.length} issue(s).` : ''}`,
      summary
    };
  }

  async create(data: any) {
    const { 
      variants, 
      images, 
      collections, 
      price, 
      mrp,
      sellingPrice,
      costPrice,
      inventory, 
      sku, 
      barcode,
      shortDescription,
      basePrice,
      baseMrp,
      baseSku,
      bundleIds,
      featuredCoupon,
      sizeGuideId,
      bundleProducts,
      rating,
      reviewsCount,
      createdAt,
      updatedAt,
      type,
      id: _id,
      ...productData 
    } = data;

    const handle = productData.handle || productData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const finalStatus = productData.status || 'DRAFT';
    const finalPublished = productData.published ?? (finalStatus === 'PUBLISHED' || finalStatus === 'ACTIVE');

    return (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Create Product
      const product = await tx.product.create({
        data: {
          ...productData,
          handle,
          status: finalStatus,
          published: finalPublished,
          ...(sizeGuideId && { sizeGuide: { connect: { id: sizeGuideId } } }),
          variants: {
            create: (variants && variants.length > 0) ? variants.map((v: any) => ({
              sku: v.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              barcode: v.barcode || null,
              price: Number(v.price || v.sellingPrice || price || 0),
              mrp: Number(v.mrp || mrp || 0),
              sellingPrice: Number(v.sellingPrice || v.price || sellingPrice || 0),
              offerPrice: v.offerPrice ? Number(v.offerPrice) : null,
              costPrice: v.costPrice ? Number(v.costPrice) : null,
              discountPercentage: v.discountPercentage ? Number(v.discountPercentage) : null,
              inventory: Number(v.inventory || inventory || 0),
              option1Name: v.option1Name || 'Size',
              option1Value: v.option1Value || 'Default',
              option2Name: v.option2Name || null,
              option2Value: v.option2Value || null,
              option3Name: v.option3Name || null,
              option3Value: v.option3Value || null,
            })) : [{
              sku: sku || `SKU-${Date.now()}`,
              barcode: barcode || null,
              price: Number(price || sellingPrice || 0),
              mrp: Number(mrp || 0),
              sellingPrice: Number(sellingPrice || price || 0),
              inventory: Number(inventory || 0),
              option1Name: 'Size',
              option1Value: 'Default'
            }],
          },
          images: {
            create: (images || []).map((img: any, idx: number) => ({
              url: img.url,
              position: img.isPrimary ? 0 : (idx + 1),
              altText: img.altText || null
            })),
          },
          collections: {
            connect: (collections || []).filter((id: string) => id && id.length > 5).map((id: string) => ({ id })),
          },
        },
        include: {
          variants: true,
          images: true,
          collections: true,
        },
      });

      return product;
    });
  }

  async update(id: string, data: any) {
    const { 
      variants, 
      images, 
      collections, 
      sizeGuideId,
      shortDescription,
      basePrice,
      baseMrp,
      baseSku,
      bundleIds,
      featuredCoupon,
      bundleProducts,
      rating,
      reviewsCount,
      createdAt,
      updatedAt,
      type,
      id: _id,
      sizeGuide,
      WishlistItem,
      wholesaleOrderItems,
      reviews,
      ...productData 
    } = data;

    const currentProduct = await (this.prisma as any).product.findUnique({ where: { id } });
    if (!currentProduct) throw new NotFoundException('Product not found');

    const finalStatus = productData.status !== undefined ? productData.status : currentProduct.status;
    let finalPublished = productData.published !== undefined ? productData.published : currentProduct.published;
    
    if (productData.published === undefined && productData.status !== undefined) {
      finalPublished = (finalStatus === 'PUBLISHED' || finalStatus === 'ACTIVE');
    }

    return (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Update basic info
      const product = await tx.product.update({
        where: { id },
        data: {
          ...productData,
          status: finalStatus,
          published: finalPublished,
          ...(sizeGuideId !== undefined && { 
            sizeGuide: sizeGuideId ? { connect: { id: sizeGuideId } } : { disconnect: true } 
          }),
          // Handle collections if provided
          collections: collections ? {
            set: collections.map((c: any) => ({ id: typeof c === 'string' ? c : c.id }))
          } : undefined
        },
      });

      // 2. Handle variants if provided
      if (variants) {
        const incomingVariantIds = variants.map((v: any) => v.id).filter(Boolean);
        
        // Delete removed variants
        await tx.variant.deleteMany({
          where: {
            productId: id,
            id: { notIn: incomingVariantIds }
          }
        });

        for (const variant of variants) {
          const variantData = {
            sku: variant.sku || null,
            barcode: variant.barcode || null,
            price: Number(variant.price ?? variant.sellingPrice ?? 0),
            mrp: variant.mrp ? Number(variant.mrp) : undefined,
            sellingPrice: variant.sellingPrice ? Number(variant.sellingPrice) : undefined,
            offerPrice: variant.offerPrice ? Number(variant.offerPrice) : undefined,
            costPrice: variant.costPrice ? Number(variant.costPrice) : undefined,
            discountPercentage: variant.discountPercentage ? Number(variant.discountPercentage) : undefined,
            inventory: variant.inventory !== undefined ? Number(variant.inventory) : undefined,
            option1Name: variant.option1Name,
            option1Value: variant.option1Value,
            option2Name: variant.option2Name,
            option2Value: variant.option2Value,
            option3Name: variant.option3Name,
            option3Value: variant.option3Value,
          };

          if (variant.id) {
            await tx.variant.update({
              where: { id: variant.id },
              data: variantData,
            });
          } else {
            await tx.variant.create({
              data: {
                ...variantData,
                productId: id,
              },
            });
          }
        }
      }

      // 3. Handle images if provided
      if (images) {
        // For simplicity and to avoid complex diffing, we'll delete and recreate images 
        // that don't have IDs, or update existing ones. 
        // A more robust way is to delete images not in the new array.
        
        const currentImages = await tx.image.findMany({ where: { productId: id } });
        const currentImageIds = currentImages.map((img: any) => img.id);
        const incomingImageIds = images.filter((img: any) => img.id).map((img: any) => img.id);

        // Delete orphans
        const orphans = currentImageIds.filter((id: string) => !incomingImageIds.includes(id));
        if (orphans.length > 0) {
          await tx.image.deleteMany({ where: { id: { in: orphans } } });
        }

        // Update or Create — re-normalize positions sequentially starting from 0
        // This prevents gaps in positions (e.g., 1,2,3 instead of 0,1,2) which
        // cause the wrong image to show as the primary product thumbnail.
        for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
          const img = images[imgIdx];
          const normalizedPosition = imgIdx; // Always 0-indexed, sequential
          if (img.id && currentImageIds.includes(img.id)) {
            await tx.image.update({
              where: { id: img.id },
              data: {
                url: img.url,
                altText: img.altText,
                position: normalizedPosition
              }
            });
          } else {
            await tx.image.create({
              data: {
                url: img.url,
                altText: img.altText,
                position: normalizedPosition,
                productId: id
              }
            });
          }
        }
      }

      // Auto-Draft if Out of Stock
      const productInfo = await tx.product.findUnique({
        where: { id },
        include: { variants: true }
      });
      if (productInfo) {
        const totalInventory = productInfo.variants.reduce((sum: number, v: any) => sum + v.inventory, 0);
        if (totalInventory <= 0 && productInfo.status !== 'DRAFT') {
          await tx.product.update({
            where: { id },
            data: { status: 'DRAFT', published: false }
          });
        }
      }

      return productInfo || product;
    });
  }

  async duplicate(id: string) {
    const original = await this.findOne(id);
    if (!original) throw new NotFoundException('Original product not found');

    const { id: _, handle: __, variants, images, collections, bundleProducts, rating, reviewsCount, ...data } = original;

    // Create a new unique handle
    const newHandle = `${original.handle}-copy-${Date.now()}`;

    return (this.prisma as any).$transaction(async (tx: any) => {
      const duplicated = await tx.product.create({
        data: {
          ...data,
          title: `${original.title} (Copy)`,
          handle: newHandle,
          published: false, // Start as draft
          variants: {
            create: variants.map((v: any) => {
              const { id: _, productId: __, ...vData } = v;
              return vData;
            }),
          },
          images: {
            create: images.map((i: any) => {
              const { id: _, productId: __, ...iData } = i;
              return iData;
            }),
          },
          collections: {
            connect: collections.map((c: any) => ({ id: c.id })),
          },
        },
      });
      return duplicated;
    });
  }

  async togglePublish(id: string) {
    const product = await (this.prisma as any).product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    const nextPublished = !product.published;
    return (this.prisma as any).product.update({
      where: { id },
      data: { 
        published: nextPublished,
        status: nextPublished ? 'ACTIVE' : 'DRAFT'
      },
    });
  }

  async bulkAction(action: string, productIds: string[], data?: any) {
    if (!productIds || productIds.length === 0) return { count: 0 };

    return (this.prisma as any).$transaction(async (tx: any) => {
      if (action === 'delete') {
        const productsWithOrders = await tx.product.findMany({
          where: { id: { in: productIds }, variants: { some: { orderItems: { some: {} } } } },
          select: { id: true },
        });
        const undeletableIds = productsWithOrders.map((p: any) => p.id);
        const deletableIds = productIds.filter((id: string) => !undeletableIds.includes(id));

        if (deletableIds.length > 0) {
          await tx.product.deleteMany({
            where: { id: { in: deletableIds } },
          });
        }

        if (undeletableIds.length > 0) {
          await tx.product.updateMany({
            where: { id: { in: undeletableIds } },
            data: { published: false, status: 'ARCHIVED' },
          });
        }

        return { 
          count: productIds.length, 
          message: undeletableIds.length > 0 
            ? `Deleted ${deletableIds.length}. Archived ${undeletableIds.length} because they are tied to orders.` 
            : undefined 
        };
      } else if (action === 'publish' || action === 'archive') {
        const published = action === 'publish';
        const result = await tx.product.updateMany({
          where: { id: { in: productIds } },
          data: { 
            published,
            status: published ? 'ACTIVE' : 'DRAFT'
          },
        });
        return { count: result.count };
      } else if (action === 'edit' && data) {
        // e.g. bulk update tags or type
        const result = await tx.product.updateMany({
          where: { id: { in: productIds } },
          data,
        });
        return { count: result.count };
      } else if (action === 'add_to_collection') {
        const { collectionId, newCollectionTitle, replace } = data || {};
        let targetCollectionId = collectionId;

        if (newCollectionTitle) {
          const handle = newCollectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          let newCol = await tx.collection.findFirst({ where: { handle } });
          if (!newCol) {
            newCol = await tx.collection.create({
              data: { title: newCollectionTitle, handle }
            });
          }
          targetCollectionId = newCol.id;
        }

        if (!targetCollectionId) {
          throw new Error('collectionId or newCollectionTitle is required');
        }

        if (replace) {
           for (const pId of productIds) {
             await tx.product.update({
               where: { id: pId },
               data: { collections: { set: [{ id: targetCollectionId }] } }
             });
           }
        } else {
           for (const pId of productIds) {
             await tx.product.update({
               where: { id: pId },
               data: { collections: { connect: [{ id: targetCollectionId }] } }
             });
           }
        }
        return { count: productIds.length, message: `Added ${productIds.length} products to collection.` };
      } else if (action === 'remove_from_collection') {
        const { collectionId } = data || {};
        if (!collectionId) throw new Error('collectionId is required');
        for (const pId of productIds) {
          await tx.product.update({
            where: { id: pId },
            data: { collections: { disconnect: [{ id: collectionId }] } }
          });
        }
        return { count: productIds.length, message: `Removed ${productIds.length} products from collection.` };
      }
      throw new Error('Invalid bulk action');
    });
  }

  async setDefaultTax(taxRate: number) {
    const result = await (this.prisma as any).product.updateMany({
      data: { taxRate, taxInclusive: true }
    });
    return { updated: result.count, taxRate };
  }

  async bulkUpdateItems(items: any[]) {
    return (this.prisma as any).$transaction(async (tx: any) => {
      let updatedCount = 0;
      for (const item of items) {
        if (!item.id) continue;
        
        // Update product
        const productData: any = {};
        
        // General Info
        if (item.title !== undefined) productData.title = item.title;
        if (item.description !== undefined) productData.description = item.description;
        
        // Classification
        if (item.category !== undefined) productData.category = item.category;
        if (item.subCategory !== undefined) productData.subCategory = item.subCategory;
        if (item.brand !== undefined) productData.brand = item.brand;
        if (item.vendor !== undefined) productData.vendor = item.vendor;
        if (item.productType !== undefined) productData.productType = item.productType;
        if (item.gender !== undefined) productData.gender = item.gender;
        if (item.ageGroup !== undefined) productData.ageGroup = item.ageGroup;
        
        // Attributes
        if (item.fabric !== undefined) productData.fabric = item.fabric;
        if (item.material !== undefined) productData.material = item.material;
        if (item.pattern !== undefined) productData.pattern = item.pattern;
        if (item.fitType !== undefined) productData.fitType = item.fitType;
        if (item.sleeveType !== undefined) productData.sleeveType = item.sleeveType;
        if (item.neckType !== undefined) productData.neckType = item.neckType;
        if (item.length !== undefined) productData.length = item.length;
        if (item.occasion !== undefined) productData.occasion = item.occasion;
        if (item.style !== undefined) productData.style = item.style;
        
        // Taxes & Meta
        if (item.hsnCode !== undefined) productData.hsnCode = item.hsnCode;
        if (item.taxRate !== undefined) productData.taxRate = Number(item.taxRate);
        if (item.taxInclusive !== undefined) productData.taxInclusive = item.taxInclusive === true || item.taxInclusive === 'true';
        if (item.tags !== undefined) productData.tags = item.tags;
        if (item.searchKeywords !== undefined) productData.searchKeywords = item.searchKeywords;
        if (item.seoTitle !== undefined) productData.seoTitle = item.seoTitle;
        if (item.metaDescription !== undefined) productData.metaDescription = item.metaDescription;
        if (item.metaKeywords !== undefined) productData.metaKeywords = item.metaKeywords;
        
        if (item.status !== undefined) {
           productData.status = item.status;
           productData.published = item.status.toString().toUpperCase() === 'ACTIVE' || item.status.toString().toUpperCase() === 'PUBLISHED';
        }
        // Removed bundleIds and featuredCoupon as they are not in schema
        
        if (item.sizeGuideId !== undefined) {
          if (item.sizeGuideId && typeof item.sizeGuideId === 'string' && item.sizeGuideId.trim() !== '') {
            const val = item.sizeGuideId.trim();
            const sg = await tx.sizeGuide.findFirst({
              where: {
                OR: [
                  { id: val },
                  { name: { equals: val, mode: 'insensitive' } }
                ]
              }
            });
            productData.sizeGuideId = sg ? sg.id : null;
          } else {
            productData.sizeGuideId = null;
          }
        }
        
        if (Object.keys(productData).length > 0) {
          await tx.product.update({ where: { id: item.id }, data: productData });
        }
        
        // Update primary variant
        const variantData: any = {};
        if (item.price !== undefined) variantData.price = Number(item.price);
        if (item.mrp !== undefined) variantData.mrp = Number(item.mrp);
        if (item.costPrice !== undefined) variantData.costPrice = Number(item.costPrice);
        if (item.sku !== undefined) variantData.sku = (item.sku || "").toString().trim() === "" ? null : item.sku.toString().trim();
        if (item.barcode !== undefined) variantData.barcode = (item.barcode || "").toString().trim() === "" ? null : item.barcode.toString().trim();
        if (item.inventory !== undefined) variantData.inventory = Number(item.inventory);
        
        if (Object.keys(variantData).length > 0) {
          const variants = await tx.variant.findMany({ where: { productId: item.id }, take: 1, orderBy: { id: 'asc' } });
          if (variants.length > 0) {
             await tx.variant.update({ where: { id: variants[0].id }, data: variantData });
          }
        }

        updatedCount++;
      }
      return { success: true, count: updatedCount };
    });
  }

  async delete(id: string) {
    const product = await (this.prisma as any).product.findUnique({
      where: { id },
      include: { variants: { include: { orderItems: { take: 1 } } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    
    const hasOrders = product.variants.some((v: any) => v.orderItems.length > 0);
    if (hasOrders) {
      return (this.prisma as any).product.update({
        where: { id },
        data: { published: false, status: 'ARCHIVED' },
      });
    }

    return (this.prisma as any).product.delete({
      where: { id },
    });
  }

  // ─── COLLECTIONS CRUD ───────────────────────────────────────────────────────

  async createCollection(data: any) {
    const handle = data.handle || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    return (this.prisma as any).collection.create({
      data: {
        ...data,
        handle,
      },
    });
  }

  async updateCollection(id: string, data: any) {
    const handle = data.handle || data.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    return (this.prisma as any).collection.update({
      where: { id },
      data: {
        ...data,
        handle,
      },
    });
  }

  async deleteCollection(id: string) {
    return (this.prisma as any).collection.delete({
      where: { id },
    });
  }

  async getCollectionWithProducts(id: string) {
    if (id.startsWith('virtual-')) {
      const category = id.replace('virtual-', '');
      const products = await this.prisma.product.findMany({
        where: { category },
        take: 200, // Safeguard limit to prevent OOM on large virtual collections
        include: { images: true, variants: true }
      });
      return {
        id,
        title: category,
        handle: category.toLowerCase().replace(/\s+/g, '-'),
        isVirtual: true,
        products
      };
    }
    return (this.prisma as any).collection.findFirst({
      where: {
        OR: [
          { id },
          { handle: id }
        ]
      },
      include: {
        products: {
          take: 200, // Safeguard limit to prevent OOM
          include: {
            images: true,
            variants: true
          }
        }
      }
    });
  }

  async addProductsToCollection(id: string, productIds: string[]) {
    return (this.prisma as any).collection.update({
      where: { id },
      data: {
        products: {
          connect: productIds.map(productId => ({ id: productId }))
        }
      }
    });
  }

  async removeProductFromCollection(id: string, productId: string) {
    return (this.prisma as any).collection.update({
      where: { id },
      data: {
        products: {
          disconnect: { id: productId }
        }
      }
    });
  }

  async trackUserInterest(userId: string, productId: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { category: true, tags: true }
      });

      if (!product) return;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { interests: true }
      });

      if (!user) return;

      const newInterests = new Set(user.interests || []);
      if (product.category) newInterests.add(product.category);
      
      const tags = (product.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
      tags.slice(0, 2).forEach((tag: string) => newInterests.add(tag));

      return this.prisma.user.update({
        where: { id: userId },
        data: {
          lastActiveAt: new Date(),
          interests: Array.from(newInterests).slice(0, 10)
        }
      });
    } catch (error) {
      console.error("[ProductService.trackUserInterest] Error:", error);
    }
  }
}
