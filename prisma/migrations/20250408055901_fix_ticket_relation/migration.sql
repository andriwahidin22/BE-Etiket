/*
  Warnings:

  - You are about to drop the column `ticketId` on the `Pemesanan` table. All the data in the column will be lost.
  - Added the required column `jenisTiketId` to the `Pemesanan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Pemesanan` DROP FOREIGN KEY `Pemesanan_ticketId_fkey`;

-- AlterTable
ALTER TABLE `Pemesanan` DROP COLUMN `ticketId`,
    ADD COLUMN `jenisTiketId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Pemesanan` ADD CONSTRAINT `Pemesanan_jenisTiketId_fkey` FOREIGN KEY (`jenisTiketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
