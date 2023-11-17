// @generated automatically by Diesel CLI.

diesel::table! {
    login_attempts (id) {
        id -> Unsigned<Bigint>,
        #[max_length = 255]
        email -> Varchar,
        timestamp -> Integer,
    }
}

diesel::table! {
    projects (id) {
        id -> Unsigned<Bigint>,
        #[max_length = 255]
        name -> Varchar,
        #[max_length = 255]
        description -> Nullable<Varchar>,
        template_id -> Unsigned<Bigint>,
    }
}

diesel::table! {
    templates (id) {
        id -> Unsigned<Bigint>,
        #[max_length = 255]
        name -> Varchar,
        description -> Nullable<Text>,
        path -> Text,
    }
}

diesel::table! {
    users (id) {
        id -> Unsigned<Bigint>,
        #[max_length = 255]
        email -> Varchar,
        #[max_length = 255]
        password_hash -> Nullable<Varchar>,
        temp_locked_until -> Nullable<Integer>,
    }
}

diesel::joinable!(projects -> templates (template_id));

diesel::allow_tables_to_appear_in_same_query!(
    login_attempts,
    projects,
    templates,
    users,
);
