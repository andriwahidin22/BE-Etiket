/*
  Warnings:

  - The values [DATANG] on the enum `Pemesanan_statusKehadiran` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Pemesanan` MODIFY `statusKehadiran` ENUM('BELUM_DATANG', 'SUDAH_DATANG', 'EXPIRED') NOT NULL DEFAULT 'BELUM_DATANG';
