BEGIN;

ALTER TABLE challenge_questions
  DROP CONSTRAINT IF EXISTS challenge_questions_question_type_check;

ALTER TABLE challenge_questions
  ADD CONSTRAINT challenge_questions_question_type_check
  CHECK (question_type IN (
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'FILL_BLANK',
    'SHORT_ANSWER',
    'LONG_ANSWER',
    'FILE_UPLOAD',
    'CODING',
    'MATCHING',
    'ORDERING',
    'SPEAKING'
  ));

COMMIT;
