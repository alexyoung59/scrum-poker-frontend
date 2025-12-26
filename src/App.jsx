import React, { useState, useEffect, useRef } from 'react';
import { Users, Settings, BarChart3, Clock, Link, Eye, UserCheck, LogOut, Plus, Share2, Vote, CheckCircle, Copy, ExternalLink, Mail, Lock } from 'lucide-react';
import apiClient from './apiClient.js';

const FIBONACCI_CARDS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, '?', '☕'];

const ScrumPokerApp = () => {
  const [currentView, setCurrentView] = useState('enterName');
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

  // Use ref to avoid stale closure in socket event handlers
  const currentRoomRef = useRef(null);

  // Initialize user and socket connection on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('scrumPokerUser');
    const savedRoom = localStorage.getItem('scrumPokerCurrentRoom');

    console.log('[INIT] Restoring session:', {
      hasSavedUser: !!savedUser,
      hasSavedRoom: !!savedRoom
    });

    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log('[INIT] Restored user:', userData);
        setUser(userData);
        apiClient.initializeSocket(userData.name, userData.anonymousId);

        if (savedRoom) {
          // Attempt to rejoin room
          joinRoom(savedRoom).catch(() => {
            localStorage.removeItem('scrumPokerCurrentRoom');
            setCurrentView('dashboard');
          });
        } else {
          setCurrentView('dashboard');
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('scrumPokerUser');
        localStorage.removeItem('scrumPokerCurrentRoom');
      }
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
    setParticipants(prev => prev.filter(p => p.anonymousId !== data.user.anonymousId));
  };

  const handleSessionStarted = (session) => {
    console.log('[HANDLE_SESSION_STARTED] Received session_started event:', session);
    setCurrentSession(session);
    setVotes({});
    setVotingRevealed(false);
    setSelectedCard(null);
    console.log('[HANDLE_SESSION_STARTED] Session state updated');
  };

  const handleVoteUpdated = (data) => {
    // Update vote indicators without revealing actual votes
    setVotes(prev => ({ ...prev, [data.anonymousId]: '●' }));
  };

  const handleVotesRevealed = (data) => {
    setVotes(data.votes.reduce((acc, vote) => {
      acc[vote.anonymousId] = vote.vote;
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
    console.log('[HANDLE_ROOM_UPDATED] Received room_updated event');
    console.log('[HANDLE_ROOM_UPDATED] data.roomId:', data.roomId);
    console.log('[HANDLE_ROOM_UPDATED] currentRoomRef.current?._id:', currentRoomRef.current?._id);

    // Convert both to strings for comparison (handles ObjectId vs string)
    const dataRoomId = String(data.roomId);
    const currentRoomId = String(currentRoomRef.current?._id);
    const match = dataRoomId === currentRoomId;

    console.log('[HANDLE_ROOM_UPDATED] Match?', match);
    console.log('[HANDLE_ROOM_UPDATED] Participants in update:', data.room?.participants?.length);

    if (match) {
      console.log('[HANDLE_ROOM_UPDATED] ✅ Room ID matches, updating state');
      setCurrentRoom(data.room);
      currentRoomRef.current = data.room; // Update ref as well
      setParticipants(data.room.participants);
      console.log('[HANDLE_ROOM_UPDATED] State updated with participants:', data.room.participants);
    } else {
      console.log('[HANDLE_ROOM_UPDATED] ❌ Room ID mismatch, NOT updating state');
      console.log('[HANDLE_ROOM_UPDATED] dataRoomId (string):', dataRoomId);
      console.log('[HANDLE_ROOM_UPDATED] currentRoomId (string):', currentRoomId);
    }
  };

  // User identification
  const generateAnonymousId = () => {
    return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const handleEnterName = (name) => {
    const anonymousId = generateAnonymousId();
    const userData = { name, anonymousId };

    setUser(userData);
    localStorage.setItem('scrumPokerUser', JSON.stringify(userData));
    setCurrentView('dashboard');
    apiClient.initializeSocket(name, anonymousId);
  };

  const handleLogout = () => {
    apiClient.logout();
    setUser(null);
    localStorage.removeItem('scrumPokerUser');
    localStorage.removeItem('scrumPokerCurrentRoom');
    setCurrentView('enterName');
    setCurrentRoom(null);
    currentRoomRef.current = null; // Clear ref as well
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
      console.log('[CREATE_ROOM] Creating room:', roomName);
      const room = await apiClient.createRoom({ name: roomName, description });
      console.log('[CREATE_ROOM] Room created, API response:', room);
      console.log('[CREATE_ROOM] Room _id:', room._id);
      console.log('[CREATE_ROOM] Room participants:', room.participants);

      // Automatically enter the created room
      setCurrentRoom(room);
      currentRoomRef.current = room; // Update ref for socket handlers
      console.log('[CREATE_ROOM] setCurrentRoom called with:', room);
      setParticipants(room.participants || []);
      setCurrentView('room');
      localStorage.setItem('scrumPokerCurrentRoom', room._id);
      console.log('[CREATE_ROOM] Calling joinSocketRoom with room._id:', room._id);
      apiClient.joinSocketRoom(room._id);

      setVotes({});
      setVotingRevealed(false);
      setSelectedCard(null);
      setCurrentSession(null);
      console.log('[CREATE_ROOM] Room setup complete');
    } catch (error) {
      console.error('[CREATE_ROOM] Error:', error);
      alert('Failed to create room: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

const joinRoom = async (roomId) => {
  setLoading(true);
  try {
    // Actually join the room (registers as participant in backend)
    const joinResponse = await apiClient.joinRoom(roomId);
    const room = joinResponse.room;

    console.log('[JOIN_ROOM] Room data received:', {
      roomId: room._id,
      hostName: room.hostName,
      hostAnonymousId: room.hostAnonymousId,
      participantCount: room.participants?.length
    });
    console.log('[JOIN_ROOM] Current user:', user);

    setCurrentRoom(room);
    currentRoomRef.current = room; // Update ref for socket handlers
    setParticipants(room.participants || []);
    setCurrentView('room');

    // Save current room to localStorage
    localStorage.setItem('scrumPokerCurrentRoom', roomId);

    // Clear session state initially - backend will send active session if one exists
    setCurrentSession(null);
    setVotes({});
    setVotingRevealed(false);
    setSelectedCard(null);

    // Join socket room for real-time updates
    // Backend will send 'session_started' event if there's an active session
    apiClient.joinSocketRoom(roomId);
  } catch (error) {
    alert('Failed to join room: ' + error.message);
    localStorage.removeItem('scrumPokerCurrentRoom');
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

    // Prevent voting when socket is disconnected
    if (!isConnected) {
      alert('Cannot vote: Disconnected from server. Please wait for reconnection.');
      return;
    }

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
    const result = currentRoom?.hostAnonymousId === user?.anonymousId;
    console.log('[IS_HOST] Check:', {
      hostAnonymousId: currentRoom?.hostAnonymousId,
      userAnonymousId: user?.anonymousId,
      isHost: result
    });
    return result;
  };

  const getParticipantRole = (anonymousId) => {
    const participant = participants.find(p => p.anonymousId === anonymousId);
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
  const votingParticipants = participants.filter(p => getParticipantRole(p.anonymousId) === 'participant');
  const allVotesSubmitted = votingParticipants.length > 0 &&
    votingParticipants.every(p => votes[p.anonymousId] !== undefined);

  // Login Component with Registration - Enhanced
  const EnterNameView = () => {
    const [name, setName] = useState('');
    const [nameFocused, setNameFocused] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (name.trim().length >= 2) {
        handleEnterName(name.trim());
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background blobs */}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's your name?
              </label>
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
                  placeholder="Enter your name"
                  minLength={2}
                  maxLength={50}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                No registration required - just enter your name to get started
              </p>
            </div>

            <button
              type="submit"
              disabled={name.trim().length < 2}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 mt-6"
            >
              Get Started
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Free forever • No account needed • Privacy focused
            </p>
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
                    // Clean up all room and session state
                    apiClient.leaveSocketRoom(currentRoom._id);
                    localStorage.removeItem('scrumPokerCurrentRoom');
                    setCurrentRoom(null);
                    currentRoomRef.current = null;
                    setCurrentSession(null);
                    setVotes({});
                    setVotingRevealed(false);
                    setSelectedCard(null);
                    setParticipants([]);
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
                          disabled={getParticipantRole(user.anonymousId) === 'observer' || votingRevealed || !isConnected}
                          className={`aspect-[3/4] rounded-lg border-2 font-bold text-lg transition-all ${
                            selectedCard === card
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-300 hover:border-gray-400 bg-white'
                          } ${
                            getParticipantRole(user.anonymousId) === 'observer' || votingRevealed || !isConnected
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

                          // Parse vote as number (votes come as strings from backend)
                          const numericVote = parseFloat(vote);
                          if (!isNaN(numericVote)) {
                            numericVotes.push(numericVote);
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
                  const participantId = participant.anonymousId;
                  const participantName = participant.name || 'Unknown';
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
                            {participantId === user?.anonymousId && ' (You)'}
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
      {currentView === 'enterName' && <EnterNameView />}
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'room' && <RoomView />}
      {currentView === 'analytics' && <AnalyticsView />}
    </div>
  );
};

export default ScrumPokerApp;