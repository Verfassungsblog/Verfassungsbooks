CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY,
email VARCHAR(255) UNIQUE NOT NULL,
password_hash VARCHAR(255),
temp_locked_until int default NULL null
);

CREATE TABLE IF NOT EXISTS login_attempts(
id SERIAL PRIMARY KEY,
email VARCHAR(255) NOT NULL,
);

CREATE TABLE IF NOT EXISTS templates(
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL,
description TEXT,
path TEXT NOT NULL
);

create table if not exists projects
(
    id          SERIAL       not null,
    name        VARCHAR(255) not null,
    description VARCHAR(255) null,
    template_id BIGINT UNSIGNED not null,
    constraint projects_pk
    primary key (id),
    constraint projects_templates_id_fk
    foreign key (template_id) references templates (id)
);
