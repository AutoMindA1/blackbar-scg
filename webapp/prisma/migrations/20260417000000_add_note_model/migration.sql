-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notes_case_id_idx" ON "notes"("case_id");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
