/**
 * 数据库层：SQLite 连接 + 建表迁移 + 预编译语句集中管理。
 * 三张表：projects/graphs（画布数据）、settings（Key/baseUrl/网关地址）、runs（运行队列）。
 */
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export function openDatabase({ dataDir }) {
  mkdirSync(dataDir, { recursive: true })
  const db = new DatabaseSync(path.join(dataDir, 'canvas.db'))

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS graphs (
      projectId TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updatedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      name TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      nodeId TEXT,
      model TEXT,
      endpointPath TEXT,
      formData TEXT,
      status TEXT,
      taskLink TEXT,
      result TEXT,
      parsedResults TEXT,
      error TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      finishedAt TEXT
    );
  `)

  const statements = {
    // ── 画布项目 ──
    listProjects: db.prepare('SELECT id, name, createdAt, updatedAt FROM projects ORDER BY updatedAt DESC'),
    getProject: db.prepare('SELECT id, name, createdAt, updatedAt FROM projects WHERE id = ?'),
    putProject: db.prepare(`INSERT INTO projects (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, createdAt = excluded.createdAt, updatedAt = excluded.updatedAt`),
    patchProject: db.prepare('UPDATE projects SET name = COALESCE(?, name), updatedAt = COALESCE(?, updatedAt) WHERE id = ?'),
    deleteProject: db.prepare('DELETE FROM projects WHERE id = ?'),
    // ── 画布图快照 ──
    getGraph: db.prepare('SELECT data FROM graphs WHERE projectId = ?'),
    putGraph: db.prepare(`INSERT INTO graphs (projectId, data, updatedAt) VALUES (?, ?, ?)
      ON CONFLICT(projectId) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt`),
    deleteGraph: db.prepare('DELETE FROM graphs WHERE projectId = ?'),
    graphNodeCounts: db.prepare('SELECT projectId, data FROM graphs'),
    // ── 设置 ──
    listSettings: db.prepare('SELECT name, value FROM settings'),
    getSetting: db.prepare('SELECT value FROM settings WHERE name = ?'),
    putSetting: db.prepare(`INSERT INTO settings (name, value) VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET value = excluded.value`),
  }

  const transaction = (fn) => {
    db.prepare('BEGIN').run()
    try {
      const result = fn()
      db.prepare('COMMIT').run()
      return result
    } catch (error) {
      db.prepare('ROLLBACK').run()
      throw error
    }
  }

  return { db, statements, transaction }
}
