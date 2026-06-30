#!/bin/bash
# ═══════════════════════════════════════════════════════
#  RAAGHAS: SQL-BASED WEBP SYNC — zero Node.js deps
#  Run on VPS: bash /tmp/sql-webp-sync.sh
# ═══════════════════════════════════════════════════════

# Get the DATABASE_URL from the API environment
ENV_FILE="/var/www/raaghas_new/current/apps/api/.env"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="/var/www/raaghas_new/apps/api/.env"
fi

echo "📁 Loading env from: $ENV_FILE"
export $(grep -v '^#' "$ENV_FILE" | grep DATABASE_URL | xargs)

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in $ENV_FILE"
  exit 1
fi

echo "✅ Database URL found. Running SQL sync..."

echo "🔗 Connecting to database..."

# Run the SQL fix using the URL directly
psql "$DATABASE_URL" << 'SQLEOF'

-- ─── 1. Fix Media Table ──────────────────────────────────────────────────────
UPDATE "Media"
SET 
  filename = regexp_replace(filename, '\.(jpg|jpeg|png)$', '.webp', 'i'),
  url = regexp_replace(url, '\.(jpg|jpeg|png)$', '.webp', 'i'),
  "mimeType" = 'image/webp'
WHERE 
  filename ~ '\.(jpg|jpeg|png)$'
  AND NOT filename ~ '\.webp$';

-- ─── 2. Fix Image Table (product images) ────────────────────────────────────
UPDATE "Image"
SET url = regexp_replace(url, '(/uploads/[^.]+)\.(jpg|jpeg|png)', '\1.webp', 'gi')
WHERE url ILIKE '%/uploads/%'
  AND url ~ '\.(jpg|jpeg|png)$';

-- ─── 3. Fix Collection banners ──────────────────────────────────────────────
UPDATE "Collection"
SET image = regexp_replace(image, '(/uploads/[^.]+)\.(jpg|jpeg|png)', '\1.webp', 'gi')
WHERE image ILIKE '%/uploads/%'
  AND image ~ '\.(jpg|jpeg|png)$';

-- ─── 4. Fix CMS Sections (JSON content) ─────────────────────────────────────
UPDATE "Section"
SET content = content::text::jsonb
WHERE content::text ILIKE '%/uploads/%';

-- More targeted: replace .jpg/.png URLs in the JSON
UPDATE "Section"
SET content = regexp_replace(content::text, '(/uploads/[^"'']+)\.(jpg|jpeg|png)', '\1.webp', 'gi')::jsonb
WHERE content::text ~ '/uploads/';

-- ─── Summary ─────────────────────────────────────────────────────────────────
SELECT 'Media fixed' as table_name, COUNT(*) FROM "Media" WHERE filename ~ '\.webp$'
UNION ALL
SELECT 'Images total', COUNT(*) FROM "Image" WHERE url ILIKE '%/uploads/%'
UNION ALL
SELECT 'Collections total', COUNT(*) FROM "Collection" WHERE image IS NOT NULL;

SQLEOF

echo ""
echo "✅ SQL Sync Complete."
