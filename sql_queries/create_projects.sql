create table if not exists public.projects
(
    project_id  uuid default gen_random_uuid() not null
        constraint projects_pk
        primary key,
    name        text                           not null,
    description text,
    template_id uuid                           not null
        constraint projects_templates_template_id_fk
        references public.templates,
    contents jsonb,
    last_modified timestamp default now()
);
