-- CreateTable
CREATE TABLE `Ticket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(191) NOT NULL,
    `jenisTiket` VARCHAR(191) NOT NULL,
    `hargaTiket` INTEGER NOT NULL,

    UNIQUE INDEX `Ticket_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Venue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(191) NOT NULL,
    `namaVenue` VARCHAR(191) NOT NULL,
    `keterangan` VARCHAR(191) NOT NULL,
    `foto` VARCHAR(191) NULL,

    UNIQUE INDEX `Venue_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pemesanan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kodePemesanan` VARCHAR(191) NOT NULL,
    `namaPengunjung` VARCHAR(191) NOT NULL,
    `tanggalKunjungan` DATETIME(3) NOT NULL,
    `banyakTiket` INTEGER NOT NULL,
    `totalPembelian` INTEGER NOT NULL,
    `ticketId` INTEGER NOT NULL,

    UNIQUE INDEX `Pemesanan_kodePemesanan_key`(`kodePemesanan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pembayaran` (
    `idTransaksi` INTEGER NOT NULL AUTO_INCREMENT,
    `totalPembayaran` INTEGER NOT NULL,
    `statusPembayaran` VARCHAR(191) NOT NULL,
    `tanggalTransaksi` DATETIME(3) NOT NULL,
    `ticketId` INTEGER NOT NULL,

    PRIMARY KEY (`idTransaksi`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Pemesanan` ADD CONSTRAINT `Pemesanan_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
