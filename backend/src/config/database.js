import Sequelize from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sqlLogFlag = process.env.DB_LOG_SQL;
const enableSqlLogging =
  sqlLogFlag === '1' || sqlLogFlag === 'true'
    ? true
    : sqlLogFlag === '0' || sqlLogFlag === 'false'
      ? false
      : process.env.NODE_ENV === 'development';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'job_share_prod_translate',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: enableSqlLogging ? console.log : false,
    // Pool: tune via .env. Total ~ DB_POOL_MAX × app instances; keep under RDS max_connections.
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 12,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 0,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 60000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
      evict: parseInt(process.env.DB_POOL_EVICT, 10) || 1000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    timezone: '+09:00' // Japan timezone
  }
);

export default sequelize;
