BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connected_account_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS connect_details_submitted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS connect_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS connect_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS connect_country CHAR(2);
CREATE TABLE IF NOT EXISTS financial_ledger(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),educator_user_id UUID NOT NULL REFERENCES users(id),offering_order_id UUID REFERENCES offering_orders(id),
 learning_journey_id UUID REFERENCES learning_journeys(id),entry_type VARCHAR(30) NOT NULL,
 gross_amount INTEGER NOT NULL DEFAULT 0,platform_fee_amount INTEGER NOT NULL DEFAULT 0,educator_amount INTEGER NOT NULL DEFAULT 0,stripe_fee_amount INTEGER,
 currency CHAR(3) NOT NULL,stripe_payment_intent_id VARCHAR(255),stripe_charge_id VARCHAR(255),stripe_transfer_id VARCHAR(255),stripe_refund_id VARCHAR(255),
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING',metadata JSONB NOT NULL DEFAULT '{}'::jsonb,occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_sale_order ON financial_ledger(offering_order_id,entry_type) WHERE entry_type='SALE';
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_charge_type ON financial_ledger(stripe_charge_id,entry_type) WHERE stripe_charge_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS refund_requests(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),offering_order_id UUID NOT NULL REFERENCES offering_orders(id),learner_user_id UUID NOT NULL REFERENCES users(id),educator_user_id UUID NOT NULL REFERENCES users(id),
 reason TEXT NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN('PENDING','APPROVED','REJECTED','INELIGIBLE','COMPLETED')),
 reviewed_by_user_id UUID REFERENCES users(id),review_note TEXT,stripe_refund_id VARCHAR(255),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),reviewed_at TIMESTAMPTZ,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(offering_order_id)
);
COMMIT;
