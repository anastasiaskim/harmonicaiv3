-- Check if the trigger function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'trigger_generate_audio_batch';

-- Check if there are any triggers on the chapters table
SELECT tgname, tgenabled, tgtype, tgevent, tgisinternal, tgconstraint, tgdeferrable, tginitdeferred, tgnargs, tgattr, tgargs, tgqual
FROM pg_trigger 
WHERE tgrelid = 'chapters'::regclass;

-- Check the most recent function calls in the database logs
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%generate-audio-batch%' 
ORDER BY last_call DESC 
LIMIT 10;
