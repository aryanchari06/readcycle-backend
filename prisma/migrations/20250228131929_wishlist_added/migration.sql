-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bookRequestId" TEXT;

-- CreateTable
CREATE TABLE "wishlist" (
    "userId" TEXT NOT NULL,
    "bookRequestId" TEXT NOT NULL,

    CONSTRAINT "wishlist_pkey" PRIMARY KEY ("userId","bookRequestId")
);

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_bookRequestId_fkey" FOREIGN KEY ("bookRequestId") REFERENCES "book_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
