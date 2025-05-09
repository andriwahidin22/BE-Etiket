-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `userId` INTEGER NULL,
    ADD COLUMN `visitDate` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
