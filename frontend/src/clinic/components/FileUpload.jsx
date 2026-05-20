import React, { useRef, useState, useMemo } from 'react';

export function FileUploadSection({ patientId, files = [], onUpload, onDelete, onDownload, disabled = false }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Ensure files is always an array
  const filesArray = useMemo(() => {
    if (Array.isArray(files)) {
      return files;
    }
    if (files && files.files && Array.isArray(files.files)) {
      return files.files;
    }
    return [];
  }, [files]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 5MB.');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only images (JPG, PNG, GIF, WebP) and PDFs are allowed.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    
    try {
      await onUpload(patientId, file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      // Call onDownload with both patientId and fileId
      
      const response = await onDownload(patientId, fileId);
      
      
      if (!response || !response.ok) {
        throw new Error('Download failed: Invalid response');
      }
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error details:', err);
      alert('Failed to download file: ' + err.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    return '📎';
  };

  return (
    <div style={{ fontSize: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
          📎 Patient Files ({filesArray.length})
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
            onChange={handleFileSelect}
            disabled={uploading || disabled}
            style={{ display: 'none' }}
            id={`file-upload-${patientId}`}
          />
          <label htmlFor={`file-upload-${patientId}`} style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 6,
                border: '1px solid var(--primary)',
                background: uploading ? 'var(--border)' : 'transparent',
                color: uploading ? 'var(--text-muted)' : 'var(--primary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: uploading ? 'not-allowed' : 'pointer',
                pointerEvents: uploading ? 'none' : 'auto',
              }}
            >
              {uploading ? '⏳ Uploading...' : '➕ Upload File'}
            </span>
          </label>
        </div>
      </div>

      {uploadError && (
        <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, color: '#c0392b', fontSize: 12 }}>
          ❌ {uploadError}
        </div>
      )}

      {filesArray.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
          No files uploaded yet
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {filesArray.map((file) => {
            
            const fileId = file._id;
            
            return (
              <div
                key={fileId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: 'var(--surface)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 18 }}>{getFileIcon(file.mimeType)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.filename || file.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {formatFileSize(file.size)} • {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Just now'} • by {file.uploadedBy || 'staff'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleDownload(fileId, file.filename || file.name)}
                    style={{
                      background: 'none',
                      border: '1px solid #c5d5e8',
                      borderRadius: 6,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: '#3498db',
                    }}
                    title="Download"
                  >
                    📥
                  </button>
                  <button
                    onClick={() => onDelete(patientId, fileId)}
                    style={{
                      background: 'none',
                      border: '1px solid #e0e0e0',
                      borderRadius: 6,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: '#e74c3c',
                    }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}