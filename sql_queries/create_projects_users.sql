create table if not exists public.projects_users
(
    user_id    uuid not null
        constraint projects_users_users_user_id_fk
        references public.users,
    project_id uuid not null
        constraint projects_users_projects_project_id_fk
        references public.projects,
    constraint projects_users_pk
        primary key (project_id, user_id)
);