/*
  Warnings:

  - Added the required column `price` to the `book_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "book_requests" ADD COLUMN     "price" TEXT NOT NULL;
