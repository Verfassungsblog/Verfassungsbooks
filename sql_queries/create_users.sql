create table if not exists public.users
(
    user_id           uuid default gen_random_uuid() not null
        constraint users_pk
        primary key,
    name              text                           not null,
    email             text                           not null,
    password_hash     text,
    temp_locked_until bigint
);