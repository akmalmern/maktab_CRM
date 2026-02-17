-- Convert legacy Subject ids (e.g. subj_...) to cuid-like ids.
-- Result format: c + 24 lowercase hex chars (passes zod cuid validator).
WITH mapped AS (
    SELECT
        s."id" AS old_id,
        ('c' || substr(md5(s."id" || clock_timestamp()::text || row_number() OVER (ORDER BY s."id")::text), 1, 24)) AS new_id
    FROM "Subject" s
    WHERE s."id" !~ '^c[a-z0-9]{24}$'
)
UPDATE "Subject" s
SET "id" = m.new_id
FROM mapped m
WHERE s."id" = m.old_id;
