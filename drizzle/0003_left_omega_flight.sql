CREATE TABLE "daily_letters" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" varchar(10) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_letters_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE INDEX "daily_letters_date_idx" ON "daily_letters" USING btree ("date");