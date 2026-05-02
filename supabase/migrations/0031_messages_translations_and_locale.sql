-- Per-message translation cache. Filled lazily on first render in a
-- non-original language; subsequent reads hit the cache instead of the
-- translation API. `original_language` is set at send time (or detected
-- on first translate) so we know which language to translate FROM.
alter table public.messages
  add column if not exists original_language text,
  add column if not exists translations jsonb not null default '{}'::jsonb;

-- Backfill: every existing message is implicitly English (the platform
-- has shipped en-only until now). Live detection in the translate
-- endpoint covers anything ambiguous from here on.
update public.messages
  set original_language = 'en'
  where original_language is null;

-- Locale gets a sane default + an index for the per-recipient broadcast
-- queries the chat send path will need. The column itself was added in
-- 0001_init.sql with default 'en-US'; some legacy rows may still have
-- an empty string or null.
update public.users
  set locale = 'en'
  where locale is null or locale = '';

create index if not exists users_locale_idx on public.users (locale);
