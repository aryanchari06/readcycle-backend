-- AlterTable
ALTER TABLE "book_requests" ADD COLUMN     "buyerId" TEXT;

-- AddForeignKey
ALTER TABLE "book_requests" ADD CONSTRAINT "book_requests_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
