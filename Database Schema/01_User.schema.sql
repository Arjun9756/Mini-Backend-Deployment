CREATE TABLE IF NOT EXISTS users(
    id varchar(100) PRIMARY KEY,
    email varchar(255) UNIQUE NOT NULL,
    name varchar(100),
    password varchar(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);