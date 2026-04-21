-- AlterTable: add extracted_text column to documents
-- Populated asynchronously during Intake agent run via Claude vision OCR.
ALTER TABLE "documents" ADD COLUMN "extracted_text" TEXT;
