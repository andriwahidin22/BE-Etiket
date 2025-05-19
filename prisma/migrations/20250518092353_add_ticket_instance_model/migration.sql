-- CreateTable
CREATE TABLE `TicketInstance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderItemId` INTEGER NOT NULL,
    `qrCode` VARCHAR(191) NOT NULL,
    `attendanceStatus` ENUM('NOT_ARRIVED', 'ARRIVED', 'EXPIRED') NOT NULL DEFAULT 'NOT_ARRIVED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TicketInstance_qrCode_key`(`qrCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TicketInstance` ADD CONSTRAINT `TicketInstance_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
