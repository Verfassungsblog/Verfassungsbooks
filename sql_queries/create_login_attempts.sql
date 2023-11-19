create table if not exists public.login_attempts
(
    login_attempt_id uuid      default gen_random_uuid() not null
        constraint login_attempts_pk
        primary key,
    user_id          uuid                                not null
        constraint login_attempts_users_user_id_fk
        references public.users
        on update cascade on delete cascade,
    timestamp        timestamp default now()             not null
);