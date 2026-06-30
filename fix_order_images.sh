#!/bin/bash
# Fix missing product images for ordered items

PGPASSWORD=raaghas_2026 psql -h localhost -U postgres -d raaghas << 'EOF'

-- Step 1: See which products linked to orders have no images
SELECT p.id, p.title, COUNT(i.id) as image_count
FROM "Product" p
LEFT JOIN "Image" i ON i."productId" = p.id
WHERE p.id IN (
  SELECT DISTINCT v."productId"
  FROM "Variant" v
  WHERE v.id IN (SELECT "variantId" FROM "OrderItem")
)
GROUP BY p.id, p.title
ORDER BY image_count ASC
LIMIT 20;

-- Step 2: Get a usable image URL to attach to all order products without images
-- We just pick any image from the products that have them
DO $$
DECLARE
  fallback_url TEXT;
  prod_rec RECORD;
BEGIN
  -- Get a fallback image URL from products that already have images
  SELECT url INTO fallback_url FROM "Image" WHERE "productId" IS NOT NULL LIMIT 1;
  
  IF fallback_url IS NULL THEN
    RAISE NOTICE 'No fallback image found, using Unsplash placeholder';
    fallback_url := 'https://images.unsplash.com/photo-1610030469668-93530c176cce';
  END IF;

  RAISE NOTICE 'Using fallback image: %', fallback_url;

  -- For each product that has orders but no images, insert an image
  FOR prod_rec IN
    SELECT p.id, p.title
    FROM "Product" p
    WHERE NOT EXISTS (SELECT 1 FROM "Image" WHERE "productId" = p.id)
    AND p.id IN (
      SELECT DISTINCT v."productId"
      FROM "Variant" v
      WHERE v.id IN (SELECT DISTINCT "variantId" FROM "OrderItem")
    )
  LOOP
    INSERT INTO "Image" (id, url, "altText", position, "productId", "createdAt")
    VALUES (
      gen_random_uuid()::text,
      fallback_url,
      prod_rec.title,
      0,
      prod_rec.id,
      NOW()
    );
    RAISE NOTICE 'Added image for product: %', prod_rec.title;
  END LOOP;
END;
$$;

-- Step 3: Verify
SELECT p.id, p.title, COUNT(i.id) as image_count
FROM "Product" p
LEFT JOIN "Image" i ON i."productId" = p.id
WHERE p.id IN (
  SELECT DISTINCT v."productId"
  FROM "Variant" v
  WHERE v.id IN (SELECT "variantId" FROM "OrderItem")
)
GROUP BY p.id, p.title
ORDER BY image_count ASC
LIMIT 20;

EOF
