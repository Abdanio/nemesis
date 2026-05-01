// Force the "web" client to avoid native libsql binaries on serverless.
const { createClient } = require("@libsql/client/web");
const { TURSO_CONNECTION_URL, TURSO_AUTH_TOKEN } = require("./config");

let _db = null;
let _wrapper = null;

class TursoClientWrapper {
  constructor(client) {
    this.client = client;
  }

  prepare(sql) {
    const client = this.client;
    return {
      async get(...params) {
        try {
          const result = await client.execute({
            sql,
            args: params,
          });
          return result.rows ? result.rows[0] : undefined;
        } catch (error) {
          throw new Error(`Query execution failed: ${error.message}`);
        }
      },
      async all(...params) {
        try {
          const result = await client.execute({
            sql,
            args: params,
          });
          return result.rows || [];
        } catch (error) {
          throw new Error(`Query execution failed: ${error.message}`);
        }
      },
      async run(...params) {
        try {
          const result = await client.execute({
            sql,
            args: params,
          });
          return {
            changes: result.rowsAffected || 0,
            lastID: result.lastInsertRowid,
          };
        } catch (error) {
          throw new Error(`Query execution failed: ${error.message}`);
        }
      },
    };
  }

  async execute(sql, params) {
    return await this.client.execute({
      sql,
      args: params || [],
    });
  }
}

function getClient() {
  if (!_db) {
    if (!TURSO_CONNECTION_URL) {
      throw new Error(
        "Missing Turso config: set TURSO_CONNECTION_URL (or TURSO_DATABASE_URL) in environment variables."
      );
    }

    _db = createClient({
      url: TURSO_CONNECTION_URL,
      authToken: TURSO_AUTH_TOKEN,
    });
    _wrapper = new TursoClientWrapper(_db);
  }
  return _wrapper;
}

module.exports = {
  getClient,
};

