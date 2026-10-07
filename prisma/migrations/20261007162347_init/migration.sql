-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PRODUCTION_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('PENDING', 'PRODUCED', 'NO_PRODUCTION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PRODUCTION_MANAGER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "no_production_reasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "no_production_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_days" (
    "id" TEXT NOT NULL,
    "productionDate" DATE NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_shifts" (
    "id" TEXT NOT NULL,
    "productionDayId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'PENDING',
    "noProductionReasonId" TEXT,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_records" (
    "id" TEXT NOT NULL,
    "productionShiftId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityTonnes" DECIMAL(12,3) NOT NULL,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_itemCode_key" ON "products"("itemCode");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_name_key" ON "shifts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_sequence_key" ON "shifts"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "no_production_reasons_name_key" ON "no_production_reasons"("name");

-- CreateIndex
CREATE UNIQUE INDEX "production_days_productionDate_key" ON "production_days"("productionDate");

-- CreateIndex
CREATE INDEX "production_days_productionDate_idx" ON "production_days"("productionDate");

-- CreateIndex
CREATE INDEX "production_days_createdById_idx" ON "production_days"("createdById");

-- CreateIndex
CREATE INDEX "production_shifts_shiftId_idx" ON "production_shifts"("shiftId");

-- CreateIndex
CREATE INDEX "production_shifts_status_idx" ON "production_shifts"("status");

-- CreateIndex
CREATE INDEX "production_shifts_createdById_idx" ON "production_shifts"("createdById");

-- CreateIndex
CREATE INDEX "production_shifts_productionDayId_idx" ON "production_shifts"("productionDayId");

-- CreateIndex
CREATE UNIQUE INDEX "production_shifts_productionDayId_shiftId_key" ON "production_shifts"("productionDayId", "shiftId");

-- CreateIndex
CREATE INDEX "production_records_productId_idx" ON "production_records"("productId");

-- CreateIndex
CREATE INDEX "production_records_createdById_idx" ON "production_records"("createdById");

-- CreateIndex
CREATE INDEX "production_records_productionShiftId_idx" ON "production_records"("productionShiftId");

-- CreateIndex
CREATE UNIQUE INDEX "production_records_productionShiftId_productId_key" ON "production_records"("productionShiftId", "productId");

-- AddForeignKey
ALTER TABLE "production_days" ADD CONSTRAINT "production_days_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_shifts" ADD CONSTRAINT "production_shifts_productionDayId_fkey" FOREIGN KEY ("productionDayId") REFERENCES "production_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_shifts" ADD CONSTRAINT "production_shifts_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_shifts" ADD CONSTRAINT "production_shifts_noProductionReasonId_fkey" FOREIGN KEY ("noProductionReasonId") REFERENCES "no_production_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_shifts" ADD CONSTRAINT "production_shifts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_productionShiftId_fkey" FOREIGN KEY ("productionShiftId") REFERENCES "production_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
