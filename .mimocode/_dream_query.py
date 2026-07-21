#!/usr/bin/env python3
"""Dream consolidation helper: read-only SQLite queries."""
import sqlite3
import sys
import json

DB_PATH = "C:/Users/heae2/.local/share/mimocode/mimocode.db"

def query(sql, params=None):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    if params:
        cur.execute(sql, params)
    else:
        cur.execute(sql)
    rows = cur.fetchall()
    conn.close()
    return rows

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "tables"
    
    if action == "tables":
        rows = query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        for r in rows:
            print(r[0])
    
    elif action == "schema":
        table = sys.argv[2] if len(sys.argv) > 2 else "session"
        rows = query(f"SELECT sql FROM sqlite_master WHERE type='table' AND name=?", [table])
        for r in rows:
            print(r[0])
    
    elif action == "sessions":
        rows = query("SELECT id, project_id, directory, title, time_created, time_updated FROM session ORDER BY time_created DESC LIMIT 50")
        for r in rows:
            print(json.dumps(dict(r)))
    
    elif action == "project-sessions":
        pid = sys.argv[2] if len(sys.argv) > 2 else ""
        rows = query("SELECT id, project_id, directory, title, time_created, time_updated FROM session WHERE project_id=? ORDER BY time_created DESC", [pid])
        for r in rows:
            print(json.dumps(dict(r)))
    
    elif action == "messages":
        sid = sys.argv[2]
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 20
        rows = query(
            "SELECT id, agent_id, time_created, substr(data, 1, 500) as preview FROM message WHERE session_id=? ORDER BY time_created LIMIT ?",
            [sid, limit]
        )
        for r in rows:
            print(json.dumps(dict(r)))
    
    elif action == "parts":
        sid = sys.argv[2]
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 50
        rows = query(
            """SELECT m.id as msg_id, m.agent_id, m.time_created,
                      json_extract(p.data, '$.type') as part_type,
                      json_extract(p.data, '$.tool') as tool,
                      substr(p.data, 1, 600) as preview
               FROM message m
               JOIN part p ON p.message_id = m.id
               WHERE m.session_id = ?
                 AND json_extract(m.data, '$.role') = 'assistant'
               ORDER BY m.time_created, p.time_created
               LIMIT ?""",
            [sid, limit]
        )
        for r in rows:
            print(json.dumps(dict(r)))
    
    elif action == "user-search":
        term = sys.argv[2]
        rows = query(
            """SELECT m.session_id, m.time_created, substr(json_extract(m.data, '$.content'), 1, 500) as content
               FROM message m
               WHERE json_extract(m.data, '$.role') = 'user'
                 AND json_extract(m.data, '$.content') LIKE ?
               ORDER BY m.time_created DESC
               LIMIT 20""",
            [f"%{term}%"]
        )
        for r in rows:
            print(json.dumps(dict(r)))
    
    elif action == "all-sessions":
        rows = query("SELECT id, project_id, directory, title, time_created, time_updated FROM session ORDER BY time_created DESC")
        for r in rows:
            print(json.dumps(dict(r)))
    
    elif action == "user-messages-full":
        sid = sys.argv[2]
        rows = query(
            """SELECT m.id, m.agent_id, m.time_created,
                      json_extract(m.data, '$.role') as role,
                      substr(m.data, 1, 2000) as data_preview
               FROM message m
               WHERE m.session_id = ?
               ORDER BY m.time_created""",
            [sid]
        )
        for r in rows:
            print(json.dumps(dict(r)))
    
    elif action == "tasks":
        rows = query("SELECT * FROM task ORDER BY time_created DESC LIMIT 20")
        for r in rows:
            print(json.dumps(dict(r)))
    
    elif action == "task-events":
        rows = query("SELECT * FROM task_event ORDER BY time_created DESC LIMIT 20")
        for r in rows:
            print(json.dumps(dict(r)))
    
    elif action == "actors":
        rows = query("SELECT * FROM actor_registry LIMIT 20")
        for r in rows:
            print(json.dumps(dict(r)))
