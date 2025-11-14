import React, { useState, useEffect } from 'react';
import { Users, Settings, BarChart3, Clock, Link, Eye, UserCheck, LogOut, Plus, Share2, Vote, CheckCircle, Copy, ExternalLink, Mail, Lock } from 'lucide-react';
import apiClient from './apiClient.js';

const FIBONACCI_CARDS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, '?', '☕'];

const ScrumPokerApp = () => {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [votes, setVotes] = useState({});
  const [votingRevealed, setVotingRevealed] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize user and socket connection on app load
  useEffect(() => {
    const currentUser = apiClient.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setCurrentView('dashboard');
      apiClient.initializeSocket();
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    const cleanupFunctions = [
      apiClient.on('socket_connected', () => setIsConnected(true)),
      apiClient.on('socket_disconnected', () => setIsConnected(false)),
      apiClient.on('user_joined', handleUserJoined),
      apiClient.on('user_disconnected', handleUserDisconnected),
      apiClient.on('session_started', handleSessionStarted),
      apiClient.on('vote_updated', handleVoteUpdated),
      apiClient.on('votes_revealed', handleVotesRevealed),
      apiClient.on('votes_reset', handleVotesReset),
      apiClient.on('room_updated', handleRoomUpdated)
    ];

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, []);

  // Socket event handlers
  const handleUserJoined = (data) => {
    if (currentRoom) {
      setParticipants(prev => [...prev, data.user]);
    }
  };

  const handleUserDisconnected = (data) => {
    setParticipants(prev => prev.filter(p => p.id !== data.user.id));
  };

  const handleSessionStarted = (session) => {
    setCurrentSession(session);
    setVotes({});
    setVotingRevealed(false);
    setSelectedCard(null);
  };

  const handleVoteUpdated = (data) => {
    // Update vote indicators without revealing actual votes
    setVotes(prev => ({ ...prev, [data.userId]: '●' }));
  };

  const handleVotesRevealed = (data) => {
    setVotes(data.votes.reduce((acc, vote) => {
      acc[vote.userId] = vote.vote;
      return acc;
    }, {}));
    setVotingRevealed(true);
  };

  const handleVotesReset = () => {
    setVotes({});
    setVotingRevealed(false);
    setSelectedCard(null);
  };

  const handleRoomUpdated = (data) => {
    if (data.roomId === currentRoom?._id) {
      setCurrentRoom(data.room);
      setParticipants(data.room.participants);
    }
  };

  // Authentication
  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const response = await apiClient.login({ email, password });
      setUser(response.user);
      setCurrentView('dashboard');
      apiClient.initializeSocket();
    } catch (error) {
      alert('Login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (email, password, name) => {
    setLoading(true);
    try {
      const response = await apiClient.register({ email, password, name });
      setUser(response.user);
      setCurrentView('dashboard');
      apiClient.initializeSocket();
    } catch (error) {
      alert('Registration failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiClient.logout();
    setUser(null);
    setCurrentView('login');
    setCurrentRoom(null);
    setCurrentSession(null);
    setVotes({});
    setParticipants([]);
  };

  // Room management
  const loadRooms = async () => {
    try {
      const roomsData = await apiClient.getRooms();
      setRooms(roomsData);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  const createRoom = async (roomName, description) => {
    setLoading(true);
    try {
      await apiClient.createRoom({ name: roomName, description });
      await loadRooms();
    } catch (error) {
      alert('Failed to create room: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

const joinRoom = async (roomId) => {
  setLoading(true);
  try {
    const room = await apiClient.getRoom(roomId);
    setCurrentRoom(room);
    setParticipants(room.participants || []);
    setCurrentView('room');
    
    // Join socket room for real-time updates
    apiClient.joinSocketRoom(roomId);
    
    setVotes({});
    setVotingRevealed(false);
    setSelectedCard(null);
    setCurrentSession(null);
  } catch (error) {
    alert('Failed to join room: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  const joinRoomByInvite = async (inviteCode) => {
    setLoading(true);
    try {
      const room = await apiClient.joinRoomByCode(inviteCode);
      await joinRoom(room._id);
    } catch (error) {
      alert('Failed to join room: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Voting session management
  const startVotingSession = async (topic, topicLink = '') => {
    if (!currentRoom) return;
    
    setLoading(true);
    try {
      const session = await apiClient.createSession({
        roomId: currentRoom._id,
        topic,
        topicLink
      });
      setCurrentSession(session);
      setVotes({});
      setVotingRevealed(false);
      setSelectedCard(null);
    } catch (error) {
      alert('Failed to start session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitVote = async (card) => {
    if (!currentSession || !user) return;
    
    try {
      await apiClient.castVote(currentSession._id, card);
      setSelectedCard(card);
      apiClient.emitVoteCast(currentSession._id, card);
    } catch (error) {
      alert('Failed to submit vote: ' + error.message);
    }
  };

  const revealVotes = async () => {
    if (!currentSession) return;
    
    setLoading(true);
    try {
      await apiClient.revealVotes(currentSession._id);
      apiClient.emitRevealVotes(currentSession._id);
    } catch (error) {
      alert('Failed to reveal votes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetVoting = () => {
    if (!currentSession) return;
    
    // Emit reset event to all participants
    apiClient.emitResetVotes(currentSession._id);
    
    // Reset local state
    setVotes({});
    setVotingRevealed(false);
    setSelectedCard(null);
  };

  // Utility functions
  const isHost = () => {
    return currentRoom?.hostId._id === user?.id || currentRoom?.hostId === user?.id;
  };

  const getParticipantRole = (participantId) => {
    const participant = participants.find(p => p.userId._id === participantId || p.userId === participantId);
    return participant?.role || 'participant';
  };

  const copyInviteLink = async () => {
    if (!currentRoom?.inviteCode) return;
    
    try {
      const link = await apiClient.copyInviteLink(currentRoom._id, currentRoom.inviteCode);
      alert('Invite link copied to clipboard!');
    } catch (error) {
      alert('Failed to copy invite link');
    }
  };

  // Load rooms when dashboard loads
  useEffect(() => {
    if (currentView === 'dashboard' && user) {
      loadRooms();
    }
  }, [currentView, user]);

  // Check if all participants have voted
  const votingParticipants = participants.filter(p => getParticipantRole(p.userId._id || p.userId) === 'participant');
  const allVotesSubmitted = votingParticipants.length > 0 && 
    votingParticipants.every(p => votes[p.userId._id || p.userId] !== undefined);

  // Login Component with Registration - Enhanced
  const LoginView = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [nameFocused, setNameFocused] = useState(false);
    const [errors, setErrors] = useState({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setErrors({});

      if (isRegistering) {
        await handleRegister(email, password, name);
      } else {
        await handleLogin(email, password);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div
          className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
        >
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4 transition-all duration-500 ${
              mounted ? 'scale-100 rotate-0' : 'scale-0 rotate-45'
            }`}>
              <Vote className="w-10 h-10 text-indigo-600 animate-pulse" />
            </div>
            <h1 className={`text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 transition-all duration-500 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}>
              Plan With Poker
            </h1>
            <p className={`text-gray-600 transition-all duration-500 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}>
              Collaborative scrum planning made simple
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && (
              <div className="transition-all duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserCheck className={`w-5 h-5 transition-colors duration-200 ${
                      nameFocused ? 'text-indigo-500' : 'text-gray-400'
                    }`} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                      nameFocused
                        ? 'border-indigo-500 ring-4 ring-indigo-100 bg-white'
                        : 'border-gray-200 bg-gray-50 hover:bg-white'
                    } focus:outline-none`}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`w-5 h-5 transition-colors duration-200 ${
                    emailFocused ? 'text-indigo-500' : 'text-gray-400'
                  }`} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                    emailFocused
                      ? 'border-indigo-500 ring-4 ring-indigo-100 bg-white'
                      : 'border-gray-200 bg-gray-50 hover:bg-white'
                  } focus:outline-none`}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 transition-colors duration-200 ${
                    passwordFocused ? 'text-indigo-500' : 'text-gray-400'
                  }`} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                    passwordFocused
                      ? 'border-indigo-500 ring-4 ring-indigo-100 bg-white'
                      : 'border-gray-200 bg-gray-50 hover:bg-white'
                  } focus:outline-none`}
                  placeholder="Enter your password"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Please wait...
                </span>
              ) : (
                isRegistering ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-indigo-600 hover:text-purple-600 text-sm font-medium transition-colors duration-200"
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Dashboard Component with Real Rooms
  const DashboardView = () => {
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [roomDescription, setRoomDescription] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [showJoinByCode, setShowJoinByCode] = useState(false);

    const handleCreateRoom = async () => {
      if (!roomName.trim()) return;
      await createRoom(roomName, roomDescription);
      setShowCreateRoom(false);
      setRoomName('');
      setRoomDescription('');
    };

    const handleJoinByCode = async () => {
      if (!inviteCode.trim()) return;
      await joinRoomByInvite(inviteCode.toUpperCase());
      setShowJoinByCode(false);
      setInviteCode('');
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Vote className="w-8 h-8 text-indigo-600 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">Plan With Poker</h1>
                {isConnected && <div className="ml-3 w-2 h-2 bg-green-500 rounded-full" title="Connected"></div>}
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentView('analytics')}
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Analytics
                </button>
                <div className="flex items-center text-gray-700">
                  <UserCheck className="w-5 h-5 mr-2" />
                  {user?.name}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Planning Rooms</h2>
              <p className="text-gray-600 mt-1">Create or join a room to start planning</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowJoinByCode(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Join by Code
              </button>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Room
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{room.name}</h3>
                    <p className="text-sm text-gray-600">Host: {room.hostId?.name || 'Unknown'}</p>
                    {room.inviteCode && (
                      <p className="text-xs text-gray-500 mt-1">Code: {room.inviteCode}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    room.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {room.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <Users className="w-4 h-4 mr-1" />
                  {room.participants?.length || 0} participants
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => joinRoom(room._id)}
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Join Room
                  </button>
                  {room.inviteCode && (
                    <button 
                      onClick={() => apiClient.copyInviteLink(room._id, room.inviteCode)}
                      className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                      title="Copy invite link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Create Room Modal */}
          {showCreateRoom && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Create New Room</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Sprint Planning Session"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={roomDescription}
                      onChange={(e) => setRoomDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-20"
                      placeholder="Planning session for upcoming sprint..."
                    />
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleCreateRoom}
                    disabled={loading || !roomName.trim()}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Room'}
                  </button>
                  <button
                    onClick={() => setShowCreateRoom(false)}
                    className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Join by Code Modal */}
          {showJoinByCode && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Join Room by Invite Code</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invite Code</label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="ABC123"
                      maxLength={6}
                    />
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleJoinByCode}
                    disabled={loading || !inviteCode.trim()}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Joining...' : 'Join Room'}
                  </button>
                  <button
                    onClick={() => setShowJoinByCode(false)}
                    className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  };

  // Room Component with Full Production Features
  const RoomView = () => {
    const [topic, setTopic] = useState('');
    const [topicLink, setTopicLink] = useState('');
    const [showStartSession, setShowStartSession] = useState(false);

    const handleStartSession = async () => {
      if (!topic.trim()) return;
      await startVotingSession(topic, topicLink);
      setShowStartSession(false);
      setTopic('');
      setTopicLink('');
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button
                  onClick={() => {
                    apiClient.leaveSocketRoom(currentRoom._id);
                    setCurrentView('dashboard');
                  }}
                  className="text-indigo-600 hover:text-indigo-700 mr-4"
                >
                  ← Back
                </button>
                <h1 className="text-xl font-semibold text-gray-900">{currentRoom?.name}</h1>
                {isConnected && <div className="ml-3 w-2 h-2 bg-green-500 rounded-full" title="Connected"></div>}
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 mr-1" />
                  {participants.length}
                </div>
                {currentRoom?.inviteCode && (
                  <button
                    onClick={copyInviteLink}
                    className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900"
                    title="Copy invite link"
                  >
                    <Copy className="w-5 h-5 mr-1" />
                    {currentRoom.inviteCode}
                  </button>
                )}
                <button className="text-gray-500 hover:text-gray-700">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Topic and Voting Section */}
            <div className="lg:col-span-2">
              {/* Current Session or Start New Session */}
              {!currentSession ? (
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Start Voting Session</h3>
                  {isHost() ? (
                    <button
                      onClick={() => setShowStartSession(true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                    >
                      Start New Session
                    </button>
                  ) : (
                    <p className="text-gray-600">Waiting for host to start a voting session...</p>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Current Topic</h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{currentSession.topic}</h4>
                      {currentSession.topicLink && (
                        <a 
                          href={currentSession.topicLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center mt-1"
                        >
                          <Link className="w-4 h-4 mr-1" />
                          View Details
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Voting Cards */}
              {currentSession && (
                <>
                  <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold">Choose Your Estimate</h3>
                      {isHost() && (
                        <div className="flex space-x-2">
                          {!votingRevealed && (
                            <button
                              onClick={revealVotes}
                              disabled={!allVotesSubmitted || loading}
                              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                allVotesSubmitted && !loading
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {loading ? 'Revealing...' : 'Reveal Votes'}
                            </button>
                          )}
                          <button
                            onClick={resetVoting}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                      {FIBONACCI_CARDS.map((card) => (
                        <button
                          key={card}
                          onClick={() => submitVote(card)}
                          disabled={getParticipantRole(user.id) === 'observer' || votingRevealed}
                          className={`aspect-[3/4] rounded-lg border-2 font-bold text-lg transition-all ${
                            selectedCard === card
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-300 hover:border-gray-400 bg-white'
                          } ${
                            getParticipantRole(user.id) === 'observer' || votingRevealed
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'hover:shadow-md'
                          }`}
                        >
                          {card}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voting Results Summary */}
                  {votingRevealed && Object.keys(votes).length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <h3 className="text-lg font-semibold mb-4">Voting Results</h3>
                      
                      {(() => {
                        const voteDistribution = {};
                        const numericVotes = [];
                        
                        Object.values(votes).forEach(vote => {
                          voteDistribution[vote] = (voteDistribution[vote] || 0) + 1;
                          
                          if (typeof vote === 'number' && !isNaN(vote)) {
                            numericVotes.push(vote);
                          }
                        });
                        
                        const average = numericVotes.length > 0 
                          ? (numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length).toFixed(1)
                          : 'N/A';
                        
                        const sortedVotes = Object.entries(voteDistribution).sort(([a], [b]) => {
                          const aNum = typeof a === 'number' ? a : (a === '?' ? 999 : 1000);
                          const bNum = typeof b === 'number' ? b : (b === '?' ? 999 : 1000);
                          return aNum - bNum;
                        });
                        
                        return (
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-gray-700 mb-3">Vote Distribution</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {sortedVotes.map(([vote, count]) => (
                                  <div key={vote} className="bg-gray-50 rounded-lg p-3 text-center">
                                    <div className="text-lg font-bold text-indigo-600 mb-1">{vote}</div>
                                    <div className="text-sm text-gray-600">
                                      {count} vote{count !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="border-t pt-4">
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                  <div className="text-xl font-bold text-blue-600">{Object.keys(votes).length}</div>
                                  <div className="text-xs text-blue-700">Total Votes</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                  <div className="text-xl font-bold text-green-600">{average}</div>
                                  <div className="text-xs text-green-700">Average</div>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-3 text-center">
                                  <div className="text-xl font-bold text-purple-600">
                                    {Object.keys(voteDistribution).length === 1 ? 'Yes' : 'No'}
                                  </div>
                                  <div className="text-xs text-purple-700">Consensus</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Participants Panel */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Participants</h3>
              <div className="space-y-3">
                {participants.map((participant) => {
                  const participantId = participant.userId._id || participant.userId;
                  const participantName = participant.userId.name || participant.name || 'Unknown';
                  const participantRole = participant.role || 'participant';
                  
                  return (
                    <div key={participantId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          participantRole === 'participant' ? 'bg-green-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <p className="font-medium text-gray-900">
                            {participantName}
                            {participantId === user?.id && ' (You)'}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">
                            {participantRole === 'participant' ? (
                              <UserCheck className="w-3 h-3 inline mr-1" />
                            ) : (
                              <Eye className="w-3 h-3 inline mr-1" />
                            )}
                            {participantRole}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        {currentSession && votes[participantId] !== undefined ? (
                          votingRevealed ? (
                            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm font-medium">
                              {votes[participantId]}
                            </span>
                          ) : (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )
                        ) : currentSession && participantRole === 'participant' ? (
                          <Clock className="w-5 h-5 text-gray-400" />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Start Session Modal */}
          {showStartSession && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Start Voting Session</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-20"
                      placeholder="What are you estimating?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link (Optional)</label>
                    <input
                      type="url"
                      value={topicLink}
                      onChange={(e) => setTopicLink(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://jira.company.com/ticket/123"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleStartSession}
                    disabled={loading || !topic.trim()}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Starting...' : 'Start Session'}
                  </button>
                  <button
                    onClick={() => setShowStartSession(false)}
                    className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  };

  // Analytics Component (Enhanced)
  const AnalyticsView = () => {
    const [analytics, setAnalytics] = useState(null);
    const [timeframe, setTimeframe] = useState('30d');

    useEffect(() => {
      const loadAnalytics = async () => {
        try {
          const data = await apiClient.getUserAnalytics(timeframe);
          setAnalytics(data);
        } catch (error) {
          console.error('Failed to load analytics:', error);
          // Fallback to mock data
          setAnalytics({
            totalSessions: 24,
            avgVotingTime: 2.5,
            consensusRate: 78,
            mostUsedCard: '8',
            recentSessions: []
          });
        }
      };

      if (currentView === 'analytics') {
        loadAnalytics();
      }
    }, [currentView, timeframe]);

    if (!analytics) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="text-indigo-600 hover:text-indigo-700 mr-4"
                >
                  ← Back
                </button>
                <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalSessions}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Voting Time</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.avgVotingTime} min</p>
                </div>
                <Clock className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Consensus Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.consensusRate}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Most Used Card</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.mostUsedCard}</p>
                </div>
                <Vote className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {analytics.recentSessions?.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
              </div>
              <div className="divide-y">
                {analytics.recentSessions.map((session) => (
                  <div key={session.id} className="p-6 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{session.topic}</p>
                      <p className="text-sm text-gray-600">
                        {session.roomName} • Duration: {session.duration} min
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm font-medium">
                        {session.finalVote}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        session.consensus 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {session.consensus ? 'Consensus' : 'No Consensus'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  };

  // Main App Render
  return (
    <div className="font-sans">
      {currentView === 'login' && <LoginView />}
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'room' && <RoomView />}
      {currentView === 'analytics' && <AnalyticsView />}
    </div>
  );
};

export default ScrumPokerApp;