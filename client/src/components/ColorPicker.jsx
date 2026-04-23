import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PALETTE = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7',
  '#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#F1948A',
  '#82E0AA','#85C1E9','#F0B27A','#EC7063','#5DADE2','#F39C12',
];

export default function ColorPicker({ onClose }) {
  const { user, updateUser } = useAuth();
  const [selected, setSelected] = useState(user?.color || PALETTE[0]);
  const [loading, setLoading]   = useState(false);
  const [saved, setSaved]       = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      const { data } = await api.patch('/users/color', { color: selected });
      updateUser(data.user);
      setSaved(true);
      setTimeout(onClose, 800);
    } catch (e) {
      console.error('Color save failed', e);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="color-picker-modal" onClick={e => e.stopPropagation()}>
        <h3>🎨 Choose Your Territory Color</h3>
        <p className="color-hint">This color marks every tile you capture</p>
        <div className="palette-grid">
          {PALETTE.map(c => (
            <button
              key={c}
              className={`palette-swatch ${selected === c ? 'sel' : ''}`}
              style={{ background: c }}
              onClick={() => setSelected(c)}
              title={c}
            />
          ))}
        </div>
        <div className="color-preview" style={{ background: selected }}>
          <span>{user?.username}</span>
        </div>
        <div className="color-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={loading}>
            {saved ? '✓ Saved!' : loading ? 'Saving…' : 'Apply Color'}
          </button>
        </div>
      </div>
    </div>
  );
}
