import { getPool } from "../db/pool.js";

export type UserRow = {
  id: string;
  email: string;
  password: string;
  created_at: Date;
};

export async function createUser(input: {
  email: string;
  password: string;
}): Promise<UserRow> {
  const result = await getPool().query<UserRow>(
    `
    INSERT INTO users (email, password)
    VALUES ($1, $2)
    RETURNING *
    `,
    [input.email, input.password],
  );

  return result.rows[0];
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const result = await getPool().query<UserRow>(
    `
    SELECT * FROM users
    WHERE email = $1
    `,
    [email],
  );

  return result.rows[0] || null;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const result = await getPool().query<UserRow>(
    `
    SELECT * FROM users
    WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] || null;
}
