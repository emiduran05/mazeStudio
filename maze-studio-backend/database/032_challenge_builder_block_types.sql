BEGIN;

ALTER TABLE challenge_builder_blocks
  DROP CONSTRAINT IF EXISTS challenge_builder_blocks_block_type_check;

ALTER TABLE challenge_builder_blocks
  ADD CONSTRAINT challenge_builder_blocks_block_type_check
  CHECK (block_type IN (
    'HEADING',
    'TEXT',
    'IMAGE',
    'VIDEO',
    'AUDIO',
    'EQUATION',
    'WHITEBOARD',
    'CODE',
    'QUOTE',
    'CALLOUT',
    'DIVIDER',
    'TABLE',
    'FILE',
    'PDF',
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'FILL_BLANK',
    'SHORT_ANSWER',
    'LONG_ANSWER',
    'FILE_UPLOAD',
    'SPEAKING'
  ));

COMMIT;
