alter table user_settings
  add column if not exists groq_api_key text;

alter table user_settings
  drop column if exists mindee_api_key;
