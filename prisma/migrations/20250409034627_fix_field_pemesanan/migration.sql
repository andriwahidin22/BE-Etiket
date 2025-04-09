/*
  Warnings:

  - The primary key for the `Pembayaran` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `idTransaksi` on the `Pembayaran` table. All the data in the column will be lost.
  - You are about to drop the column `ticketId` on the `Pembayaran` table. All the data in the column will be lost.
  - You are about to drop the column `banyakTiket` on the `Pemesanan` table. All the data in the column will be lost.
  - You are about to drop the column `tanggalKunjungan` on the `Pemesanan` table. All the data in the column will be lost.
  - Added the required column `id` to the `Pembayaran` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pemesananId` to the `Pembayaran` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jumlahTiket` to the `Pemesanan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tanggalBerkunjung` to the `Pemesanan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Pembayaran` DROP FOREIGN KEY `Pembayaran_ticketId_fkey`;

-- AlterTable
ALTER TABLE `Pembayaran` DROP PRIMARY KEY,
    DROP COLUMN `idTransaksi`,
    DROP COLUMN `ticketId`,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `pemesananId` INTEGER NOT NULL,
    MODIFY `tanggalTransaksi` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `Pemesanan` DROP COLUMN `banyakTiket`,
    DROP COLUMN `tanggalKunjungan`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `jumlahTiket` INTEGER NOT NULL,
    ADD COLUMN `tanggalBerkunjung` DATETIME(3) NOT NULL;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_pemesananId_fkey` FOREIGN KEY (`pemesananId`) REFERENCES `Pemesanan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
