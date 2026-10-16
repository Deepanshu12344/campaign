import net from 'net';
import path from 'path';
import fs from 'fs';
import EmbeddedPostgres from 'embedded-postgres';

const PORT = 5432;
const USER = 'postgres';
const PASSWORD = 'password';
const DB_NAME = 'campaigns';
const DATA_DIR = path.resolve(__dirname, '../.postgres-data');

export function checkPort(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true); // Port is open
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function ensurePostgresRunning(): Promise<EmbeddedPostgres | null> {
  const isRunning = await checkPort(PORT);
  if (isRunning) {
    return null; // External or already running Postgres
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
  });

  try {
    await pg.initialise();
  } catch {
    // Already initialized
  }

  await pg.start();

  try {
    await pg.createDatabase(DB_NAME);
  } catch {
    // Database already exists
  }

  return pg;
}

// If executed directly
if (require.main === module) {
  (async () => {
    const isRunning = await checkPort(PORT);
    if (isRunning) {
      console.log(`PostgreSQL is already active on port ${PORT}.`);
      process.exit(0);
    }

    console.log(`Starting embedded PostgreSQL on port ${PORT}...`);
    const pg = await ensurePostgresRunning();
    console.log(`Embedded PostgreSQL running on 127.0.0.1:${PORT}. Database '${DB_NAME}' ready.`);

    process.on('SIGINT', async () => {
      console.log('Shutting down embedded PostgreSQL...');
      if (pg) await pg.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      if (pg) await pg.stop();
      process.exit(0);
    });

    // Keep process alive if invoked as background runner
    setInterval(() => {}, 10000);
  })().catch((err) => {
    console.error('Failed to run embedded PostgreSQL:', err);
    process.exit(1);
  });
}
