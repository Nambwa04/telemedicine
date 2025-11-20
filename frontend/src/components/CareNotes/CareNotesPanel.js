import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Button,
  Badge,
  Spinner,
  Alert,
  Modal,
  ListGroup,
} from 'react-bootstrap';
import {
  getCareNotesForPatient,
  createCareNote,
  deleteCareNote,
  markCareNoteAsRead,
  toggleCareNotePin,
  archiveCareNote,
  unarchiveCareNote,
  addCareNoteComment,
} from '../../services/careNotesService';
import './CareNotesPanel.css';

const NOTE_TYPES = [
  { value: 'general', label: 'General', variant: 'secondary' },
  { value: 'handoff', label: 'Handoff', variant: 'info' },
  { value: 'observation', label: 'Observation', variant: 'primary' },
  { value: 'alert', label: 'Alert', variant: 'warning' },
  { value: 'medication', label: 'Medication', variant: 'success' },
  { value: 'vital', label: 'Vital Signs', variant: 'danger' },
  { value: 'followup', label: 'Follow-up', variant: 'dark' },
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', variant: 'secondary' },
  { value: 'normal', label: 'Normal', variant: 'primary' },
  { value: 'high', label: 'High', variant: 'warning' },
  { value: 'urgent', label: 'Urgent', variant: 'danger' },
];

const CareNotesPanel = ({ patientId, currentUserRole }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  
  // Form states
  const [newNote, setNewNote] = useState({
    note_type: 'general',
    priority: 'normal',
    content: '',
    is_pinned: false,
  });
  const [commentContent, setCommentContent] = useState('');

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCareNotesForPatient(patientId, {
        is_archived: showArchived,
      });
      setNotes(data.results || data);
    } catch (err) {
      setError('Failed to load care notes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [patientId, showArchived]);

  useEffect(() => {
    if (patientId) {
      fetchNotes();
    }
  }, [patientId, fetchNotes]);

  // Mark as read when viewing
  const handleNoteClick = async (note) => {
    if (!note.is_read) {
      try {
        await markCareNoteAsRead(note.id);
        // Update local state
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }
  };

  // Create note
  const handleCreateNote = async (e) => {
    e.preventDefault();
    try {
      await createCareNote({
        patient: patientId,
        ...newNote,
      });
      setShowCreateModal(false);
      setNewNote({
        note_type: 'general',
        priority: 'normal',
        content: '',
        is_pinned: false,
      });
      fetchNotes();
    } catch (err) {
      setError('Failed to create note');
      console.error(err);
    }
  };

  // Toggle pin
  const handleTogglePin = async (noteId) => {
    try {
      await toggleCareNotePin(noteId);
      fetchNotes();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // Archive/Unarchive
  const handleArchive = async (noteId, archive = true) => {
    try {
      if (archive) {
        await archiveCareNote(noteId);
      } else {
        await unarchiveCareNote(noteId);
      }
      fetchNotes();
    } catch (err) {
      console.error('Failed to archive/unarchive:', err);
    }
  };

  // Delete
  const handleDelete = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteCareNote(noteId);
        fetchNotes();
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    }
  };

  // Add comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim() || !selectedNote) return;

    try {
      await addCareNoteComment(selectedNote.id, commentContent);
      setCommentContent('');
      setShowCommentModal(false);
      fetchNotes();
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  // Get badge variant for note type
  const getTypeVariant = (type) => {
    return NOTE_TYPES.find((t) => t.value === type)?.variant || 'secondary';
  };

  // Get badge variant for priority
  const getPriorityVariant = (priority) => {
    return PRIORITY_LEVELS.find((p) => p.value === priority)?.variant || 'primary';
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Sort notes: pinned first, then by creation date
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Check if user can modify notes (not patient)
  const canModify = currentUserRole !== 'patient';

  return (
    <div className="care-notes-panel">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Care Notes</h4>
        <div>
          <Form.Check
            type="switch"
            id="show-archived"
            label="Show Archived"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="d-inline-block me-3"
          />
          {canModify && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              + New Note
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
        </div>
      ) : sortedNotes.length === 0 ? (
        <Alert variant="info">No care notes yet.</Alert>
      ) : (
        <div className="notes-list">
          {sortedNotes.map((note) => (
            <Card
              key={note.id}
              className={`note-card mb-3 ${!note.is_read ? 'unread' : ''} ${
                note.is_pinned ? 'pinned' : ''
              }`}
              onClick={() => handleNoteClick(note)}
            >
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="mb-2">
                      {note.is_pinned && (
                        <Badge bg="warning" className="me-2">
                          📌 Pinned
                        </Badge>
                      )}
                      <Badge bg={getTypeVariant(note.note_type)} className="me-2">
                        {NOTE_TYPES.find((t) => t.value === note.note_type)?.label}
                      </Badge>
                      <Badge bg={getPriorityVariant(note.priority)}>
                        {PRIORITY_LEVELS.find((p) => p.value === note.priority)?.label}
                      </Badge>
                      {!note.is_read && (
                        <Badge bg="success" className="ms-2">
                          New
                        </Badge>
                      )}
                    </div>
                    <Card.Text style={{ whiteSpace: 'pre-wrap' }}>
                      {note.content}
                    </Card.Text>
                    <small className="text-muted">
                      By {note.author_name} • {formatDate(note.created_at)}
                      {note.comments_count > 0 && (
                        <span className="ms-2">
                          💬 {note.comments_count} comment
                          {note.comments_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </small>
                  </div>

                  {canModify && (
                    <div className="note-actions ms-3">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(note.id);
                        }}
                        title={note.is_pinned ? 'Unpin' : 'Pin'}
                      >
                        {note.is_pinned ? '📌' : '📍'}
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNote(note);
                          setShowCommentModal(true);
                        }}
                        title="Add comment"
                      >
                        💬
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(note.id, !note.is_archived);
                        }}
                        title={note.is_archived ? 'Unarchive' : 'Archive'}
                      >
                        {note.is_archived ? '📂' : '🗃️'}
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(note.id);
                        }}
                        title="Delete"
                      >
                        🗑️
                      </Button>
                    </div>
                  )}
                </div>

                {/* Show comments if any */}
                {note.comments && note.comments.length > 0 && (
                  <div className="mt-3 pt-3 border-top">
                    <strong>Comments:</strong>
                    <ListGroup variant="flush" className="mt-2">
                      {note.comments.map((comment) => (
                        <ListGroup.Item key={comment.id} className="px-0">
                          <small className="text-muted">
                            {comment.author_name} • {formatDate(comment.created_at)}
                          </small>
                          <div>{comment.content}</div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </div>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {/* Create Note Modal */}
      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Care Note</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateNote}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Note Type</Form.Label>
              <Form.Select
                value={newNote.note_type}
                onChange={(e) =>
                  setNewNote({ ...newNote, note_type: e.target.value })
                }
                required
              >
                {NOTE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Priority</Form.Label>
              <Form.Select
                value={newNote.priority}
                onChange={(e) =>
                  setNewNote({ ...newNote, priority: e.target.value })
                }
                required
              >
                {PRIORITY_LEVELS.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={newNote.content}
                onChange={(e) =>
                  setNewNote({ ...newNote, content: e.target.value })
                }
                placeholder="Enter note details..."
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Pin this note (appears at top)"
                checked={newNote.is_pinned}
                onChange={(e) =>
                  setNewNote({ ...newNote, is_pinned: e.target.checked })
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Note
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Add Comment Modal */}
      <Modal
        show={showCommentModal}
        onHide={() => {
          setShowCommentModal(false);
          setCommentContent('');
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Comment</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddComment}>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Comment</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Enter your comment..."
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCommentModal(false);
                setCommentContent('');
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add Comment
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default CareNotesPanel;
