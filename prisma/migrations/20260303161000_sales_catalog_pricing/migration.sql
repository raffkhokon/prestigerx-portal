CREATE TABLE IF NOT EXISTS "SalesRepPricingFloor" (
  "id" TEXT NOT NULL,
  "salesRepId" TEXT NOT NULL,
  "pharmacyId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "floorPrice" DOUBLE PRECISION NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesRepPricingFloor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SalesRepPricingFloor_salesRepId_pharmacyId_productId_key"
  ON "SalesRepPricingFloor"("salesRepId", "pharmacyId", "productId");
CREATE INDEX IF NOT EXISTS "SalesRepPricingFloor_salesRepId_idx" ON "SalesRepPricingFloor"("salesRepId");
CREATE INDEX IF NOT EXISTS "SalesRepPricingFloor_pharmacyId_idx" ON "SalesRepPricingFloor"("pharmacyId");
CREATE INDEX IF NOT EXISTS "SalesRepPricingFloor_productId_idx" ON "SalesRepPricingFloor"("productId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesRepPricingFloor_salesRepId_fkey') THEN
    ALTER TABLE "SalesRepPricingFloor"
      ADD CONSTRAINT "SalesRepPricingFloor_salesRepId_fkey"
      FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesRepPricingFloor_pharmacyId_fkey') THEN
    ALTER TABLE "SalesRepPricingFloor"
      ADD CONSTRAINT "SalesRepPricingFloor_pharmacyId_fkey"
      FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesRepPricingFloor_productId_fkey') THEN
    ALTER TABLE "SalesRepPricingFloor"
      ADD CONSTRAINT "SalesRepPricingFloor_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "AccountCatalogPrice" (
  "id" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL,
  "scopeId" TEXT NOT NULL,
  "salesRepId" TEXT NOT NULL,
  "pharmacyId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "offeredPrice" DOUBLE PRECISION NOT NULL,
  "floorPriceSnapshot" DOUBLE PRECISION,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountCatalogPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountCatalogPrice_scopeType_scopeId_salesRepId_pharmacyId_productId_key"
  ON "AccountCatalogPrice"("scopeType", "scopeId", "salesRepId", "pharmacyId", "productId");
CREATE INDEX IF NOT EXISTS "AccountCatalogPrice_scopeType_scopeId_idx" ON "AccountCatalogPrice"("scopeType", "scopeId");
CREATE INDEX IF NOT EXISTS "AccountCatalogPrice_salesRepId_idx" ON "AccountCatalogPrice"("salesRepId");
CREATE INDEX IF NOT EXISTS "AccountCatalogPrice_pharmacyId_idx" ON "AccountCatalogPrice"("pharmacyId");
CREATE INDEX IF NOT EXISTS "AccountCatalogPrice_productId_idx" ON "AccountCatalogPrice"("productId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AccountCatalogPrice_salesRepId_fkey') THEN
    ALTER TABLE "AccountCatalogPrice"
      ADD CONSTRAINT "AccountCatalogPrice_salesRepId_fkey"
      FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AccountCatalogPrice_pharmacyId_fkey') THEN
    ALTER TABLE "AccountCatalogPrice"
      ADD CONSTRAINT "AccountCatalogPrice_pharmacyId_fkey"
      FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AccountCatalogPrice_productId_fkey') THEN
    ALTER TABLE "AccountCatalogPrice"
      ADD CONSTRAINT "AccountCatalogPrice_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
