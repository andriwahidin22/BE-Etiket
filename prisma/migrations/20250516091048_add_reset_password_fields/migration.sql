-- AlterTable
ALTER TABLE `User` ADD COLUMN `resetPasswordCode` VARCHAR(191) NULL,
    ADD COLUMN `resetPasswordExpiresAt` DATETIME(3) NULL;
