import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import styles from '../styles/Notes.module.css';

// Automatically detect environment and use appropriate API URL
const getApiUrl = () => {
  // If environment variable is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // For server-side rendering, default to production URL
  if (typeof window === 'undefined') {
    return "https://aditya-notes-api.fly.dev";
  }

  // For client-side, check hostname
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return "http://localhost:8000";
  }

  return "https://aditya-notes-api.fly.dev";
};

const API = getApiUrl();

// TagInput Component
const TagInput = forwardRef(({ tags, setTags, availableTags }, ref) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Function to commit any pending input and return updated tags
  const commitPendingInput = () => {
    if (inputValue.trim()) {
      const trimmed = inputValue.trim().toLowerCase();
      if (trimmed && !tags.includes(trimmed)) {
        const newTags = [...tags, trimmed];
        setTags(newTags);
        setInputValue("");
        setShowSuggestions(false);
        return newTags; // Return the new tags array
      }
    }
    return tags; // Return current tags if nothing was added
  };

  // Expose the commit function to parent component
  useImperativeHandle(ref, () => ({
    commitPendingInput
  }));

  const fetchSuggestions = async (query) => {
    try {
      const res = await fetch(`${API}/tags/suggestions?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch tag suggestions:", error);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.trim()) {
      fetchSuggestions(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const addTag = (tagName) => {
    const trimmed = tagName.trim().toLowerCase();
    console.log('🏷️ Adding tag:', trimmed, 'Current tags:', tags);
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      console.log('✅ Setting new tags:', newTags);
      setTags(newTags);
    } else {
      console.log('❌ Tag not added - empty or duplicate');
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('⌨️ Enter pressed, input value:', inputValue);
      if (inputValue.trim()) {
        addTag(inputValue);
      } else {
        console.log('❌ Input value is empty');
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setInputValue("");
    }
  };

  return (
    <div className={styles.tagInputContainer}>
      <div className={styles.tagList}>
        {tags.map((tag, index) => (
          <span key={index} className={styles.tag}>
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className={styles.tagRemove}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Add tags..." : ""}
          className={styles.tagInput}
        />
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className={styles.tagSuggestions}>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => addTag(suggestion.name)}
              className={styles.tagSuggestion}
            >
              {suggestion.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default function Home() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [viewingNote, setViewingNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tags, setTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  
  // Ref for TagInput to commit pending input
  const createTagInputRef = useRef();
  const editTagInputRef = useRef();


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

  async function loadTags() {
    try {
      const res = await fetch(`${API}/tags`);
      if (res.ok) {
        setAvailableTags(await res.json());
      }
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  }

  useEffect(() => { 
    load(); 
    loadTags();
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    
    // Commit any pending tag input before submitting
    let finalTags = tags;
    if (createTagInputRef.current) {
      finalTags = createTagInputRef.current.commitPendingInput();
      console.log('🏷️ Final tags after commit:', finalTags);
    }
    
    try {
      const payload = { title: title.trim(), content: content.trim(), tags: finalTags };
      console.log('🚀 Creating note with payload:', payload);
      console.log('🔗 API URL:', API);
      console.log('📦 JSON body being sent:', JSON.stringify(payload));
      
      const res = await fetch(`${API}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      console.log('📡 Response status:', res.status);
      const responseData = await res.json();
      console.log('📨 Response data:', responseData);
      if (res.ok) {
        console.log('✅ Note created successfully');
        setTitle(""); 
        setContent("");
        setTags([]);
        setShowCreateModal(false);
        load();
        loadTags();
      } else {
        console.log('❌ Failed to create note:', responseData);
      }
    } catch (error) {
      console.error("❌ Network error:", error);
    }
  }

  async function update(e) {
    e.preventDefault();
    if (!editingNote || !editingNote.title.trim()) return;
    
    // Commit any pending tag input before submitting
    let finalEditTags = editingNote.tags || [];
    if (editTagInputRef.current) {
      finalEditTags = editTagInputRef.current.commitPendingInput();
      console.log('🏷️ Final edit tags after commit:', finalEditTags);
    }
    
    try {
      const res = await fetch(`${API}/notes/${editingNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: editingNote.title.trim(), 
          content: editingNote.content.trim(),
          tags: finalEditTags
        })
      });
      if (res.ok) {
        setEditingNote(null);
        load();
        loadTags();
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
    setEditingNote({...note, tags: note.tags ? note.tags.map(t => t.name) : []});
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
    setTags([]);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setTitle("");
    setContent("");
    setTags([]);
  }

  const filteredNotes = notes.filter(note => {
    const searchLower = searchTerm.toLowerCase();
    return (
      note.title.toLowerCase().includes(searchLower) ||
      note.content?.toLowerCase().includes(searchLower) ||
      (note.tags && note.tags.some(tag => tag.name.toLowerCase().includes(searchLower)))
    );
  });

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
        <h1 className={styles.title}>Notes</h1>
        <p className={styles.subtitle}>Organize your ideas</p>
      </header>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.sectionTitle}>
            Your Notes ({filteredNotes.length})
          </h2>
          <input
            type="text"
            placeholder="Search notes, content, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button 
          onClick={openCreateModal}
          className={styles.createNoteButton}
          data-tooltip="Create New Note"
        >
          +
        </button>
      </div>

      {/* Notes Table */}
      <div className={styles.notesSection}>
        
        {filteredNotes.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No notes found. Create your first note above.</p>
          </div>
        ) : (
          <div className={styles.notesTable}>
            <div className={styles.tableHeader}>
              <div>Title</div>
              <div>Content</div>
              <div>Tags</div>
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
                    <div className={styles.noteTags}>
                      {note.tags && note.tags.length > 0 ? (
                        note.tags.map((tag, index) => (
                          <span key={index} className={styles.noteTag}>
                            {tag.name}
                          </span>
                        ))
                      ) : (
                        <span className={styles.noTags}>No tags</span>
                      )}
                    </div>
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
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => startEdit(note)}
                      className={`${styles.actionButton} ${styles.editButton}`}
                      title="Edit note"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => remove(note.id)}
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      title="Delete note"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
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
                Edit Note
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
              <h2 className={styles.modalTitle}>Create New Note</h2>
              <button onClick={closeCreateModal} className={styles.closeButton}>
                ✕
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
              <div>
                <label className={styles.label}>Tags ({tags.length})</label>
                <TagInput 
                  ref={createTagInputRef}
                  tags={tags} 
                  setTags={setTags} 
                  availableTags={availableTags} 
                />
                <small style={{color: '#666', fontSize: '12px'}}>
                  Current tags: {tags.length === 0 ? 'None' : tags.join(', ')}
                </small>
              </div>
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={closeCreateModal} 
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  Create Note
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
              <h2 className={styles.modalTitle}>Edit Note</h2>
              <button onClick={cancelEdit} className={styles.closeButton}>
                ✕
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
              <div>
                <label className={styles.label}>Tags</label>
                <TagInput 
                  ref={editTagInputRef}
                  tags={editingNote.tags || []} 
                  setTags={(newTags) => setEditingNote({...editingNote, tags: newTags})} 
                  availableTags={availableTags} 
                />
              </div>
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={cancelEdit} 
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}