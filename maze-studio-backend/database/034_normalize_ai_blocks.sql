BEGIN;
UPDATE step_blocks SET content=jsonb_build_object('text',content#>>'{}','level',2)
WHERE block_type='HEADING' AND settings->>'generatedByAI'='true' AND jsonb_typeof(content)='string';
UPDATE step_blocks SET content=jsonb_build_object('text',content#>>'{}')
WHERE block_type='TEXT' AND settings->>'generatedByAI'='true' AND jsonb_typeof(content)='string';
UPDATE step_blocks SET content=jsonb_build_object('text',content#>>'{}')
WHERE block_type='CALLOUT' AND settings->>'generatedByAI'='true' AND jsonb_typeof(content)='string';
UPDATE step_blocks SET content=jsonb_build_object('text',content#>>'{}','author','')
WHERE block_type='QUOTE' AND settings->>'generatedByAI'='true' AND jsonb_typeof(content)='string';
UPDATE step_blocks SET content=jsonb_build_object('expression',content#>>'{}','caption','')
WHERE block_type='EQUATION' AND settings->>'generatedByAI'='true' AND jsonb_typeof(content)='string';
UPDATE step_blocks block SET content=jsonb_build_object(
  'question',COALESCE(block.content->>'question',block.content->>'prompt',''),
  'options',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'text',CASE WHEN jsonb_typeof(option.value)='string' THEN option.value#>>'{}' ELSE COALESCE(option.value->>'text',option.value->>'label','') END,'isCorrect',CASE WHEN option.value ? 'isCorrect' THEN (option.value->>'isCorrect')::boolean ELSE option.ordinality-1=COALESCE((block.content->>'correctAnswerIndex')::int,-1) END) ORDER BY option.ordinality) FROM jsonb_array_elements(COALESCE(block.content->'options','[]'::jsonb)) WITH ORDINALITY option(value,ordinality)),'[]'::jsonb),
  'explanation',COALESCE(block.content->>'explanation',''))
WHERE block.block_type='MULTIPLE_CHOICE' AND block.settings->>'generatedByAI'='true';
UPDATE step_blocks block SET content=jsonb_build_object(
  'text',regexp_replace(COALESCE(block.content->>'text',block.content->>'prompt',''),'_{2,}','{{blank}}','g'),
  'acceptedAnswers',COALESCE(block.content->'acceptedAnswers',(SELECT jsonb_agg(COALESCE(blank.value->>'correctAnswer',blank.value->>'answer','')) FROM jsonb_array_elements(COALESCE(block.content->'blanks','[]'::jsonb)) blank(value)),'[]'::jsonb),
  'explanation',COALESCE(block.content->>'explanation',''))
WHERE block.block_type='FILL_BLANKS' AND block.settings->>'generatedByAI'='true';
COMMIT;
