import { Sequelize } from 'sequelize';
import { config } from './env';

const sequelizePg = new Sequelize(
  config.pg.name,
  config.pg.user,
  config.pg.password,
  {
    host: config.pg.host,
    port: config.pg.port,
    dialect: 'postgres',
    logging: config.nodeEnv === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export default sequelizePg;
