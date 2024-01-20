use std::collections::BTreeMap;
use std::sync::Arc;
use rocket::request::FromRequest;
use rocket::{Request, request, State};
use rocket_dyn_templates::Template;
use crate::data_storage::DataStorage;
use crate::projects::Person;
use crate::session::session_guard::Session;

#[derive(Debug, PartialEq, FromFormField)]
pub enum OrderBy{
    FirstnameAscending,
    FirstnameDescending,
    LastnameAscending,
    LastnameDescending,
}

#[get("/persons?<offset>&<limit>&<order>")]
pub fn list_persons(_session: Session, data_storage: &State<Arc<DataStorage>>, offset: Option<u32>, limit: Option<u32>, order: Option<OrderBy>) -> Template {
    let mut persons : Vec<Person> = data_storage.data.read().unwrap().persons.iter().map(|person|person.1.read().unwrap().clone()).collect();

    let offset = offset.unwrap_or_else(|| 0);
    let limit = limit.unwrap_or_else(|| 10);
    let order = order.unwrap_or_else(|| OrderBy::FirstnameAscending);

    //Sort persons
    match order{
        OrderBy::FirstnameAscending | OrderBy::FirstnameDescending => persons.sort_unstable_by(|a, b| a.first_names.cmp(&b.first_names)),
        OrderBy::LastnameAscending | OrderBy::LastnameDescending => persons.sort_unstable_by(|a, b| a.last_names.cmp(&b.last_names)),
    }

    //Reverse order if descending
    match order{
        OrderBy::FirstnameDescending | OrderBy::LastnameDescending => persons.reverse(),
        _ => {},
    }

    let selected_persons : Vec<&Person> = persons.iter().skip(offset as usize).take(limit as usize).collect();

    let mut data = BTreeMap::new();
    data.insert("persons", selected_persons);
    Template::render("persons", data)
}