/*
  Warnings:

  - You are about to alter the column `paymentStatus` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(2))`.
  - A unique constraint covering the columns `[orderId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `Payment` DROP FOREIGN KEY `Payment_orderId_fkey`;

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `paymentMethod` VARCHAR(191) NULL,
    ADD COLUMN `redirectUrl` VARCHAR(191) NULL,
    ADD COLUMN `settlementTime` DATETIME(3) NULL,
    ADD COLUMN `snapToken` VARCHAR(191) NULL,
    MODIFY `orderId` INTEGER NULL,
    MODIFY `paymentStatus` ENUM('PENDING', 'SUCCESS', 'FAILED', 'CHALLENGE', 'EXPIRED') NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX `Payment_orderId_key` ON `Payment`(`orderId`);

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
