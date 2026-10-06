import { getPool } from "../db/pool.js";

export type ThreadRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
};

export type MessageRow = {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: Date;
};

export async function getOrCreateThread(input: {
  threadId: string;
  userId: string;
}): Promise<ThreadRow> {
  const result = await getPool().query<ThreadRow>(
    `
    INSERT INTO threads (id, user_id, title)
    VALUES ($1, $2, 'New Conversation')
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    RETURNING *
    `,
    [input.threadId, input.userId],
  );

  return result.rows[0];
}

export async function updateThreadTitle(input: {
  threadId: string;
  title: string;
}): Promise<void> {
  await getPool().query(
    `
    UPDATE threads
    SET title = $1, updated_at = NOW()
    WHERE id = $2
    `,
    [input.title, input.threadId],
  );
}

export async function listUserThreads(
  userId: string,
): Promise<ThreadRow[]> {
  const result = await getPool().query<ThreadRow>(
    `
    SELECT * FROM threads
    WHERE user_id = $1
    ORDER BY updated_at DESC
    LIMIT 30
    `,
    [userId],
  );

  return result.rows;
}

export async function getThreadById(input: {
  threadId: string;
  userId: string;
}): Promise<ThreadRow | null> {
  const result = await getPool().query<ThreadRow>(
    `
    SELECT * FROM threads
    WHERE id = $1 AND user_id = $2
    `,
    [input.threadId, input.userId],
  );

  return result.rows[0] || null;
}

export async function saveMessage(input: {
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
}): Promise<MessageRow> {
  const result = await getPool().query<MessageRow>(
    `
    INSERT INTO messages (thread_id, role, content)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [input.threadId, input.role, input.content],
  );

  // Update thread's updated_at timestamp
  await getPool().query(
    `UPDATE threads SET updated_at = NOW() WHERE id = $1`,
    [input.threadId],
  );

  return result.rows[0];
}

export async function getThreadMessages(
  threadId: string,
): Promise<MessageRow[]> {
  const result = await getPool().query<MessageRow>(
    `
    SELECT * FROM messages
    WHERE thread_id = $1
    ORDER BY created_at ASC
    `,
    [threadId],
  );

  return result.rows;
}
