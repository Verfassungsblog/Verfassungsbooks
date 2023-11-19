create table if not exists public.templates
(
    template_id uuid default gen_random_uuid() not null
        constraint templates_pk
        primary key,
    name        text                           not null,
    description text
);