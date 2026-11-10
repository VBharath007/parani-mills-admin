import React, { useState, useEffect } from 'react';
import { History, Search, Trash2, RefreshCw, Eye, Edit, X } from 'lucide-react';
import { productsAPI, blogsAPI } from '../../services/api';
import './ActivityLogs.css';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [viewLog, setViewLog] = useState(null);
  const [editLog, setEditLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      let storedLogs = JSON.parse(localStorage.getItem('admin_activity_logs') || '[]');
      
      const [productsRes, blogsRes] = await Promise.all([
        productsAPI.getAll().catch(() => ({ data: [] })),
        blogsAPI.getAll().catch(() => ({ data: [] }))
      ]);

      const allItems = [
        ...(productsRes?.data || []),
        ...(blogsRes?.data || [])
      ];

      storedLogs = storedLogs.map(log => {
        if (!log.image && log.targetName) {
          const match = allItems.find(item => 
            (item.name && item.name === log.targetName) || 
            (item.title && item.title === log.targetName)
          );
          if (match) {
            return {
              ...log,
              image: match.thumbnail || match.coverImage || (match.images && match.images[0]) || '',
              category: match.category || log.category
            };
          }
        }
        return log;
      });

      setLogs(storedLogs);
    } catch (e) {
      console.error('Failed to load logs', e);
    }
  };

  const clearLogs = () => {
    if (window.confirm("Are you sure you want to clear all history logs?")) {
      localStorage.removeItem('admin_activity_logs');
      setLogs([]);
    }
  };

  const deleteSingleLog = (id) => {
    if (window.confirm("Are you sure you want to delete this log entry?")) {
      const updatedLogs = logs.filter(log => log.id !== id);
      localStorage.setItem('admin_activity_logs', JSON.stringify(updatedLogs));
      setLogs(updatedLogs);
    }
  };

  const handleEditSave = (e) => {
    e.preventDefault();
    const updatedLogs = logs.map(log => log.id === editLog.id ? editLog : log);
    localStorage.setItem('admin_activity_logs', JSON.stringify(updatedLogs));
    setLogs(updatedLogs);
    setEditLog(null);
  };

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q)) ||
      (log.targetName && log.targetName.toLowerCase().includes(q)) ||
      (log.date && log.date.includes(q))
    );
  });

  return (
    <div className="activity-logs-container">
      <div className="page-header-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#dcfce7', padding: '12px', borderRadius: '50%', display: 'flex' }}>
            <History size={26} style={{ color: '#059669' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--green-deep)', margin: 0, paddingBottom: '0.2rem' }}>
              Admin Activity History
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
              Track all admin actions, modifications, and updates automatically
            </p>
          </div>
        </div>
        
        <div className="page-actions-group">
          <button className="outline-pill-btn" onClick={fetchLogs}>
            <RefreshCw size={15} />
            <span>Sync Logs</span>
          </button>
          <button className="primary-red-btn" onClick={clearLogs} style={{ marginLeft: '10px' }}>
            <Trash2 size={16} />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      <div className="table-controls-bar" style={{ justifyContent: 'flex-end', marginTop: '1.5rem', marginBottom: '1rem' }}>
        <div className="search-box-wrap">
          <Search size={16} className="search-box-icon" />
          <input
            type="text"
            className="search-box-input"
            placeholder="Search history logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>DATE & TIME</th>
              <th>USER</th>
              <th>ACTION</th>
              <th>DETAILS</th>
              <th>PRODUCT NAME</th>
              <th className="action-center">OPTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const dateObj = new Date(log.date);
                const dateStr = dateObj.toLocaleDateString('en-GB');
                const timeStr = dateObj.toLocaleTimeString('en-US');
                
                return (
                  <tr key={log.id}>
                    <td>
                      <div className="log-date">
                        <span className="log-date-main">{dateStr}</span>
                        <span className="log-time-sub">{timeStr}</span>
                      </div>
                    </td>
                    <td>
                      <span className="log-user">{log.user || 'Admin'}</span>
                    </td>
                    <td>
                      <span className={`log-badge ${log.action?.toLowerCase()}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.details}</td>
                    <td className="item-code-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {log.image ? (
                          <img 
                            src={log.image} 
                            alt="" 
                            style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }} 
                            onError={(e) => {
                              e.target.onerror = null; 
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='38' height='38' viewBox='0 0 38 38'%3E%3Crect width='38' height='38' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' font-weight='bold' fill='%2394a3b8'%3EN/A%3C/text%3E%3C/svg%3E";
                            }}
                          />
                        ) : (
                          <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>N/A</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>{log.targetName || '-'}</span>
                          {log.category && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{log.category}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons-group action-center">
                        <button className="icon-action-btn view" title="View Details" onClick={() => setViewLog(log)}>
                          <Eye size={16} />
                        </button>
                        <button className="icon-action-btn edit" title="Edit Log" onClick={() => setEditLog(log)}>
                          <Edit size={16} />
                        </button>
                        <button className="icon-action-btn delete" title="Delete Log" onClick={() => deleteSingleLog(log.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="empty-table-cell">
                  No history logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* VIEW MODAL */}
      {viewLog && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Log Details</h3>
              <button className="close-btn" onClick={() => setViewLog(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              <div><strong>Action Type:</strong> <span className={`log-badge ${viewLog.action?.toLowerCase()}`}>{viewLog.action}</span></div>
              <div><strong>Date & Time:</strong> {new Date(viewLog.date).toLocaleString()}</div>
              <div><strong>User:</strong> {viewLog.user}</div>
              <div><strong>Target:</strong> {viewLog.targetName}</div>
              <div><strong>Details:</strong> {viewLog.details}</div>
            </div>
            <div className="modal-footer">
              <button className="outline-pill-btn" onClick={() => setViewLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editLog && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '450px', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3>Edit Log Details</h3>
              <button className="close-btn" onClick={() => setEditLog(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="modal-body" style={{ padding: '2rem 1.5rem', flex: 1 }}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.5rem', display: 'block' }}>Action Details</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editLog.details} 
                    onChange={(e) => setEditLog({...editLog, details: e.target.value})} 
                    required 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.5rem', display: 'block' }}>Target Record</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editLog.targetName} 
                    onChange={(e) => setEditLog({...editLog, targetName: e.target.value})} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                <button type="button" onClick={() => setEditLog(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: '50px', background: '#fff', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.25rem', borderRadius: '50px', background: 'var(--green-primary)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(10, 92, 54, 0.2)' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;
