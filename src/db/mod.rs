//! Database module
//! Verfassungsbooks uses sqlx + postgresql to store all data.
//! This module contains all database related code.

/// Code to create a new connection pool
pub mod connection_pool;
/// Code to setup the database if it is not already setup
pub mod setup;

/// Code to manage users
pub mod users;

/// Code to manage login attempts
pub mod login_attempts;