#!/usr/bin/env python3
"""Get specific message content."""
import sqlite3
import json
import sys

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

def get_text_parts(msg_id):
    rows = query(
        "SELECT json_extract(data, '$.text') as text FROM part WHERE message_id=? AND json_extract(data, '$.type')='text'",
        [msg_id]
    )
    return [r['text'] for r in rows if r['text']]

action = sys.argv[1]
msg_id = sys.argv[2] if len(sys.argv) > 2 else ""

if action == "text-parts":
    parts = get_text_parts(msg_id)
    for p in parts:
        print(p)
        print("---")

elif action == "full-message":
    rows = query("SELECT data FROM message WHERE id=?", [msg_id])
    for r in rows:
        data = json.loads(r['data'])
        print(json.dumps(data, indent=2, ensure_ascii=False))

elif action == "full-part":
    rows = query("SELECT data FROM part WHERE id=? OR (message_id=? AND json_extract(data,'$.type')='text')", [msg_id, msg_id])
    for r in rows:
        data = json.loads(r['data'])
        print(json.dumps(data, indent=2, ensure_ascii=False))
        print("===")

elif action == "explore-summary":
    # Get the final message from explore-1 agent
    rows = query(
        """SELECT id FROM message
           WHERE session_id=? AND agent_id LIKE 'explore%' AND json_extract(data, '$.finish')='stop'
           ORDER BY time_created DESC LIMIT 1""",
        [msg_id]
    )
    if rows:
        final_msg_id = rows[0]['id']
        parts = get_text_parts(final_msg_id)
        for p in parts:
            print(p)
    else:
        print("No final explore message found")

elif action == "main-final-text":
    # Get the last assistant text from main agent
    rows = query(
        """SELECT m.id FROM message m
           WHERE m.session_id=? AND m.agent_id='main' AND json_extract(m.data, '$.role')='assistant'
           ORDER BY m.time_created DESC LIMIT 1""",
        [msg_id]
    )
    if rows:
        parts = get_text_parts(rows[0]['id'])
        for p in parts:
            print(p)

elif action == "all-text-parts":
    # Get all text parts for a session, ordered by time
    rows = query(
        """SELECT m.agent_id, m.time_created, json_extract(p.data, '$.text') as text
           FROM message m
           JOIN part p ON p.message_id = m.id
           WHERE m.session_id=? AND json_extract(p.data, '$.type')='text'
           ORDER BY m.time_created, p.time_created""",
        [msg_id]
    )
    for r in rows:
        print(f"[{r['agent_id']}] t={r['time_created']}")
        if r['text']:
            print(r['text'][:3000])
        print("---")

elif action == "user-content":
    rows = query(
        """SELECT json_extract(m.data, '$.content') as content FROM message m
           WHERE m.session_id=? AND json_extract(m.data, '$.role')='user'
           ORDER BY m.time_created LIMIT 5""",
        [msg_id]
    )
    for r in rows:
        if r['content']:
            print(r['content'][:5000])
        print("---")
