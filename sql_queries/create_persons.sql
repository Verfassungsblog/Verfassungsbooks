create table persons
(
    person_id uuid default gen_random_uuid() not null
        constraint persons_pk
        primary key,
    data      jsonb
);