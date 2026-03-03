-- Add pharmacy-specific identifier strategy
ALTER TABLE "Pharmacy"
  ADD COLUMN IF NOT EXISTS "requiresSku" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "identifierType" TEXT NOT NULL DEFAULT 'name';

-- Create per-pharmacy product mapping table
CREATE TABLE IF NOT EXISTS "PharmacyProductMapping" (
  "id" TEXT NOT NULL,
  "pharmacyId" TEXT NOT NULL,
  "productId" TEXT,
  "localProductName" TEXT NOT NULL,
  "externalSku" TEXT,
  "externalNdc" TEXT,
  "externalCode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PharmacyProductMapping_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PharmacyProductMapping_pharmacyId_idx"
  ON "PharmacyProductMapping"("pharmacyId");
CREATE INDEX IF NOT EXISTS "PharmacyProductMapping_productId_idx"
  ON "PharmacyProductMapping"("productId");

CREATE UNIQUE INDEX IF NOT EXISTS "PharmacyProductMapping_pharmacyId_localProductName_key"
  ON "PharmacyProductMapping"("pharmacyId", "localProductName");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PharmacyProductMapping_pharmacyId_fkey'
  ) THEN
    ALTER TABLE "PharmacyProductMapping"
      ADD CONSTRAINT "PharmacyProductMapping_pharmacyId_fkey"
      FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PharmacyProductMapping_productId_fkey'
  ) THEN
    ALTER TABLE "PharmacyProductMapping"
      ADD CONSTRAINT "PharmacyProductMapping_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
