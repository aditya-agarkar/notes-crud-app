import { useEffect, useState } from "react";
import styles from '../styles/Notes.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [viewingNote, setViewingNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function load() {
    try {
      const res = await fetch(`${API}/notes`);
      if (res.ok) {
        setNotes(await res.json());
      }
    } catch (error) {
      console.error("Failed to load notes:", error);
    }
  }

  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    
    try {
      const res = await fetch(`${API}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() })
      });
      if (res.ok) {
        setTitle(""); 
        setContent("");
        setShowCreateModal(false);
        load();
      }
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  }

  async function update(e) {
    e.preventDefault();
    if (!editingNote || !editingNote.title.trim()) return;
    
    try {
      const res = await fetch(`${API}/notes/${editingNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: editingNote.title.trim(), 
          content: editingNote.content.trim() 
        })
      });
      if (res.ok) {
        setEditingNote(null);
        load();
      }
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  }

  async function remove(id) {
    if (!confirm("Are you sure you want to delete this note?")) return;
    
    try {
      const res = await fetch(`${API}/notes/${id}`, { method: "DELETE" });
      if (res.ok) {
        load();
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  }

  function startEdit(note) {
    setEditingNote({...note});
    setViewingNote(null);
    setShowCreateModal(false);
  }

  function cancelEdit() {
    setEditingNote(null);
  }

  function viewNote(note) {
    setViewingNote(note);
    setEditingNote(null);
    setShowCreateModal(false);
  }

  function openCreateModal() {
    setShowCreateModal(true);
    setEditingNote(null);
    setViewingNote(null);
    setTitle("");
    setContent("");
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setTitle("");
    setContent("");
  }

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>📝 My Notes</h1>
        <p className={styles.subtitle}>Organize your thoughts and ideas</p>
      </header>

      {/* Search Bar */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="🔍 Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Create Note Button */}
      <button 
        onClick={openCreateModal}
        className={styles.createNoteButton}
      >
        ➕ Create New Note
      </button>

      {/* Notes Table */}
      <div className={styles.notesSection}>
        <h2 className={styles.sectionTitle}>
          📚 Your Notes ({filteredNotes.length})
        </h2>
        
        {filteredNotes.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No notes found. Create your first note above! 📝</p>
          </div>
        ) : (
          <div className={styles.notesTable}>
            <div className={styles.tableHeader}>
              <div>Title</div>
              <div>Content</div>
              <div>Created</div>
              <div>Actions</div>
            </div>
            <div className={styles.tableBody}>
              {filteredNotes.map(note => (
                <div key={note.id} className={styles.tableRow}>
                  <div>
                    <h3 className={styles.noteTitle}>{note.title}</h3>
                  </div>
                  <div>
                    <p className={styles.notePreview}>
                      {note.content 
                        ? (note.content.length > 150 
                           ? note.content.substring(0, 150) + "..." 
                           : note.content)
                        : "No content"
                      }
                    </p>
                  </div>
                  <div>
                    <span className={styles.noteDate}>
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                  <div className={styles.noteActions}>
                    <button
                      onClick={() => viewNote(note)}
                      className={`${styles.actionButton} ${styles.viewButton}`}
                      title="View note"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => startEdit(note)}
                      className={`${styles.actionButton} ${styles.editButton}`}
                      title="Edit note"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => remove(note.id)}
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      title="Delete note"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewingNote && (
        <div className={styles.modal} onClick={() => setViewingNote(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{viewingNote.title}</h2>
              <button
                onClick={() => setViewingNote(null)}
                className={styles.closeButton}
              >
                ❌
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                {viewingNote.content || "No content"}
              </p>
              <small className={styles.modalDate}>
                Created: {formatDate(viewingNote.created_at)}
              </small>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={() => startEdit(viewingNote)}
                className={styles.primaryButton}
              >
                ✏️ Edit Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Note Modal */}
      {showCreateModal && (
        <div className={styles.modal} onClick={closeCreateModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>✨ Create New Note</h2>
              <button onClick={closeCreateModal} className={styles.closeButton}>
                ❌
              </button>
            </div>
            <form onSubmit={add} className={styles.modalForm}>
              <input
                value={title}
                placeholder="Enter note title..."
                onChange={e => setTitle(e.target.value)}
                required
                className={styles.input}
              />
              <textarea
                value={content}
                placeholder="Write your note content..."
                onChange={e => setContent(e.target.value)}
                className={styles.textarea}
                rows="6"
              />
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={closeCreateModal} 
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  ➕ Create Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingNote && (
        <div className={styles.modal} onClick={cancelEdit}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>✏️ Edit Note</h2>
              <button onClick={cancelEdit} className={styles.closeButton}>
                ❌
              </button>
            </div>
            <form onSubmit={update} className={styles.modalForm}>
              <input
                value={editingNote.title}
                onChange={e => setEditingNote({...editingNote, title: e.target.value})}
                required
                className={styles.input}
              />
              <textarea
                value={editingNote.content}
                onChange={e => setEditingNote({...editingNote, content: e.target.value})}
                className={styles.textarea}
                rows="6"
              />
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={cancelEdit} 
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  💾 Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}