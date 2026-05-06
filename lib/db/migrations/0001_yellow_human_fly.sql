ALTER TABLE "offline_payment_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_gateways" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "offline_payment_requests" CASCADE;--> statement-breakpoint
DROP TABLE "payment_gateways" CASCADE;--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_stripe_customer_id_unique";--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_stripe_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "plans" DROP CONSTRAINT "plans_gateway_id_payment_gateways_id_fk";
--> statement-breakpoint
ALTER TABLE "twilio_configs" DROP CONSTRAINT "twilio_configs_payment_gateway_id_payment_gateways_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "media_file_length" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "subscription_status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "evolution_instances" ADD COLUMN "twilio_account_sid" text;--> statement-breakpoint
ALTER TABLE "evolution_instances" ADD COLUMN "twilio_auth_token" text;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_team_timestamp_idx" ON "activity_logs" USING btree ("team_id","timestamp");--> statement-breakpoint
CREATE INDEX "invitations_team_id_idx" ON "invitations" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "messages_chat_timestamp_idx" ON "messages" USING btree ("chat_id","timestamp");--> statement-breakpoint
CREATE INDEX "team_members_team_id_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_members_user_id_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "call_credit_transactions" DROP COLUMN "stripe_payment_intent_id";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "gateway_id";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "gateway_product_id";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "gateway_price_id";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "stripe_product_id";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "stripe_price_id";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "amount";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "interval";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "trial_days";--> statement-breakpoint
ALTER TABLE "team_phone_numbers" DROP COLUMN "stripe_subscription_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "stripe_subscription_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "stripe_product_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "gateway_type";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "gateway_customer_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "gateway_subscription_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "is_canceled";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "trial_ends_at";--> statement-breakpoint
ALTER TABLE "twilio_configs" DROP COLUMN "credit_price_per_pack";--> statement-breakpoint
ALTER TABLE "twilio_configs" DROP COLUMN "credits_per_pack";--> statement-breakpoint
ALTER TABLE "twilio_configs" DROP COLUMN "price_per_number";--> statement-breakpoint
ALTER TABLE "twilio_configs" DROP COLUMN "payment_gateway_id";--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "team_email_invitation_unique_idx" UNIQUE("team_id","email","status");--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_user_unique_idx" UNIQUE("team_id","user_id");