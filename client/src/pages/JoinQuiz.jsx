import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

export default function JoinQuiz() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');

    const code = roomCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('Enter a room code');
      return;
    }

    if (!socket || !connected) {
      setError('Not connected to server. Please wait...');
      return;
    }

    setLoading(true);
    try {
      // Emit join-room event and navigate on success
      socket.emit('join-room', { roomCode: code, user: { id: user.id, username: user.username } });

      // Listen for errors
      const onError = (data) => {
        setError(data.message);
        setLoading(false);
      };
      socket.once('error', onError);

      // Navigate to player room
      navigate(`/play/${code}`);
    } catch (err) {
      setError(err.message || 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">Join Quiz</h1>
        <p className="text-gray-600 text-center mb-6">Enter the room code from the organizer</p>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="label">Room Code</label>
            <input
              type="text"
              className="input text-center text-3xl font-mono font-bold tracking-[0.3em] uppercase"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary w-full !py-3 text-lg" disabled={loading}>
            {loading ? 'Connecting...' : '🎮 Join'}
          </button>
        </form>
      </div>
    </div>
  );
}
