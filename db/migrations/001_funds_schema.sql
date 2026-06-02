CREATE TABLE IF NOT EXISTS user_wallets (
  privy_user_id TEXT PRIMARY KEY,
  signer_address TEXT NOT NULL,
  proxy_address TEXT NOT NULL,
  session_mode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_proxy ON user_wallets (proxy_address);

CREATE TABLE IF NOT EXISTS user_deposit_bridges (
  privy_user_id TEXT PRIMARY KEY REFERENCES user_wallets (privy_user_id) ON DELETE CASCADE,
  proxy_address TEXT NOT NULL,
  evm_address TEXT,
  svm_address TEXT,
  tron_address TEXT,
  btc_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_deposit_bridges_proxy ON user_deposit_bridges (proxy_address);

CREATE TABLE IF NOT EXISTS withdraw_bridge_destinations (
  id BIGSERIAL PRIMARY KEY,
  privy_user_id TEXT NOT NULL REFERENCES user_wallets (privy_user_id) ON DELETE CASCADE,
  proxy_address TEXT NOT NULL,
  to_chain_id TEXT NOT NULL,
  to_token_address TEXT NOT NULL,
  recipient_addr TEXT NOT NULL,
  bridge_evm TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (privy_user_id, to_chain_id, to_token_address, recipient_addr)
);

CREATE INDEX IF NOT EXISTS idx_withdraw_dest_privy ON withdraw_bridge_destinations (privy_user_id);

CREATE TABLE IF NOT EXISTS funds_movements (
  id BIGSERIAL PRIMARY KEY,
  privy_user_id TEXT NOT NULL REFERENCES user_wallets (privy_user_id) ON DELETE CASCADE,
  proxy_address TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('deposit', 'withdraw')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'processing')),
  amount_usd NUMERIC(20, 6) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT NOT NULL,
  from_chain_id TEXT,
  to_chain_id TEXT,
  from_token_address TEXT,
  to_token_address TEXT,
  token_symbol TEXT,
  token_decimals INTEGER,
  from_amount_base_unit TEXT,
  bridge_status_address TEXT,
  source_address TEXT,
  recipient_addr TEXT,
  tx_hash TEXT,
  raw_bridge_transaction JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_funds_movements_user_time
  ON funds_movements (privy_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_funds_movements_proxy_time
  ON funds_movements (proxy_address, occurred_at DESC);
