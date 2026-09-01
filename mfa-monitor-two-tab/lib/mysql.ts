import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

let pool: Pool | undefined;

function getMysqlConfig() {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || '3306');
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE || 'maximo_integration';
  const connectionLimit = Number(process.env.MYSQL_CONNECTION_LIMIT || '10');

  if (!user || !password) throw new Error('MYSQL_USER and MYSQL_PASSWORD are not configured.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('MYSQL_PORT must be a valid TCP port.');
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1) throw new Error('MYSQL_CONNECTION_LIMIT must be a positive integer.');

  return { host, port, user, password, database, connectionLimit };
}

export function getDbPool() {
  if (!pool) {
    const { connectionLimit, ...config } = getMysqlConfig();
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

export async function withDbConnection<T>(fn: (connection: PoolConnection) => Promise<T>) {
  const connection = await getDbPool().getConnection();
  try {
    return await fn(connection);
  } finally {
    connection.release();
  }
}

export async function checkDatabaseConnection() {
  const connection = await getDbPool().getConnection();
  try {
    await connection.ping();
    const [rows] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS database_name');
    return String(rows[0]?.database_name || '');
  } finally {
    connection.release();
  }
}

export type DbResult<T = ResultSetHeader> = T;
