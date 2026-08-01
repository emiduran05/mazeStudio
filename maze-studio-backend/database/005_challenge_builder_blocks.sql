BEGIN;

CREATE TABLE IF NOT EXISTS challenge_builder_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  question_id UUID UNIQUE REFERENCES challenge_questions(id) ON DELETE CASCADE,
  block_type VARCHAR(30) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (block_type IN (
    'HEADING','TEXT','IMAGE','VIDEO','CODE','QUOTE','CALLOUT','DIVIDER',
    'TABLE','FILE','PDF',
    'SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE','FILL_BLANK',
    'SHORT_ANSWER','LONG_ANSWER','FILE_UPLOAD'
  ))
);

CREATE INDEX IF NOT EXISTS idx_challenge_builder_blocks_order
  ON challenge_builder_blocks(challenge_id, position, created_at);

INSERT INTO challenge_builder_blocks (
  challenge_id, question_id, block_type, position
)
SELECT question.challenge_id, question.id, question.question_type,
       question.position
FROM challenge_questions question
WHERE NOT EXISTS (
  SELECT 1
  FROM challenge_builder_blocks block
  WHERE block.question_id=question.id
);

COMMIT;
