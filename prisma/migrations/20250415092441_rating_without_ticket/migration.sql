/*
  Warnings:

  - You are about to drop the column `nilai` on the `Rating` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Rating` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `skor` to the `Rating` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Rating` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Rating` DROP COLUMN `nilai`,
    ADD COLUMN `skor` INTEGER NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Rating_userId_key` ON `Rating`(`userId`);
