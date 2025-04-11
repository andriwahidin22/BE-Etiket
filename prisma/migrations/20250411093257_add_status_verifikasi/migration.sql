/*
  Warnings:

  - You are about to drop the column `verifikasiAt` on the `Pemesanan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Pemesanan` DROP COLUMN `verifikasiAt`,
    ADD COLUMN `statusKehadiran` ENUM('BELUM_DATANG', 'DATANG', 'EXPIRED') NOT NULL DEFAULT 'BELUM_DATANG';
