require('dotenv').config();

module.exports = {
  development: {
    username: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_NAME || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
  },
  test: {
    username: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_NAME || 'postgres_test',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_NAME,
    host: process.env.PG_HOST,
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
};
