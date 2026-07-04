alter table tech_requests
  add column if not exists handler_id bigint references app_users(id) on delete set null;
