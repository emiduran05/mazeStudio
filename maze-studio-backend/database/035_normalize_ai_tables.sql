BEGIN;
WITH normalized AS (
  SELECT block.id,block.settings,block.content,
    (SELECT jsonb_agg(row_data.cells ORDER BY row_data.row_order) FROM (
      SELECT 0::bigint row_order,(SELECT jsonb_agg(jsonb_build_object('value',header.value#>>'{}','isHeader',true) ORDER BY header.ordinality) FROM jsonb_array_elements(COALESCE(block.content->'headers','[]'::jsonb)) WITH ORDINALITY header(value,ordinality)) cells
      WHERE jsonb_array_length(COALESCE(block.content->'headers','[]'::jsonb))>0
      UNION ALL
      SELECT source_row.ordinality,(SELECT jsonb_agg(jsonb_build_object('value',CASE WHEN jsonb_typeof(cell.value)='object' THEN COALESCE(cell.value->>'value',cell.value->>'text','') ELSE cell.value#>>'{}' END,'isHeader',CASE WHEN jsonb_typeof(cell.value)='object' THEN COALESCE((cell.value->>'isHeader')::boolean,false) ELSE false END) ORDER BY cell.ordinality) FROM jsonb_array_elements(source_row.value) WITH ORDINALITY cell(value,ordinality))
      FROM jsonb_array_elements(COALESCE(block.content->'rows','[]'::jsonb)) WITH ORDINALITY source_row(value,ordinality)
    ) row_data) rows
  FROM step_blocks block
  WHERE block.block_type='TABLE' AND block.settings->>'generatedByAI'='true'
    AND (block.content ? 'headers' OR EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(block.content->'rows','[]'::jsonb)) row_value WHERE jsonb_typeof(row_value)='array' AND jsonb_array_length(row_value)>0 AND jsonb_typeof(row_value->0)<>'object'))
)
UPDATE step_blocks block SET content=jsonb_build_object('rows',normalized.rows),settings=COALESCE(normalized.settings,'{}'::jsonb)||jsonb_build_object('striped',COALESCE((normalized.settings->>'striped')::boolean,false),'showBorders',true,'headerRow',jsonb_array_length(COALESCE(normalized.content->'headers','[]'::jsonb))>0)
FROM normalized WHERE block.id=normalized.id;
COMMIT;
