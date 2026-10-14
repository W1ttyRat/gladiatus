-- usernames are unique regardless of case ("Bob" and "bob" are the same player)
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));
