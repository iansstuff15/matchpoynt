ALTER TABLE "club_invoice_payers" ADD COLUMN "payments" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "payment_qrs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "session_invoices" ADD COLUMN "payments" jsonb DEFAULT '[]'::jsonb NOT NULL;