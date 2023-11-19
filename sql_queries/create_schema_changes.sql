create table if not exists public.schema_changes
(
    version integer                 not null,
    rollout timestamp default now() not null
);