import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function load() {
    const res = await fetch(`${API}/notes`);
    setNotes(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    await fetch(`${API}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content })
    });
    setTitle(""); setContent("");
    load();
  }

  async function remove(id) {
    await fetch(`${API}/notes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main style={{padding:20}}>
      <h1>Notes</h1>
      <form onSubmit={add}>
        <input value={title} placeholder="title" onChange={e=>setTitle(e.target.value)} required/>
        <br/>
        <textarea value={content} placeholder="content" onChange={e=>setContent(e.target.value)} />
        <br/>
        <button type="submit">Add</button>
      </form>

      <ul>
        {notes.map(n => (
          <li key={n.id}>
            <strong>{n.title}</strong>
            <div>{n.content}</div>
            <small>{n.created_at}</small>
            <br/>
            <button onClick={()=>remove(n.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
