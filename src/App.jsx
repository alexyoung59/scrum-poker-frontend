import React, { useState, useEffect } from 'react';
import { Users, Settings, BarChart3, Clock, Link, Eye, UserCheck, LogOut, Plus, Share2, Vote, CheckCircle } from 'lucide-react';

const FIBONACCI_CARDS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, '?', '☕'];

const ScrumPokerApp = () => {
  const [currentView, setCurrentView] = useState('login'); // login, dashboard, room, analytics
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [votes, setVotes] = useState({});
  const [votingRevealed, setVotingRevealed] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    if (currentView === 'dashboard' && user) {
      setRooms([
        { id: '1', name: 'Sprint 24 Planning', host: 'Alice Johnson', participants: 8, active: true },
        { id: '2', name: 'Q2 Feature Planning', host: 'Bob Smith', participants: 12, active: false },
      ]);
    }
  }, [currentView, user]);

  const handleLogin = (email, password) => {
    // Mock login - in real app, this would authenticate with backend
    setUser({ id: '1', name: 'John Doe', email, role: 'participant' });
    setCurrentView('dashboard');
  };

  const createRoom = (roomName, description) => {
    const newRoom = {
      id: Date.now().toString(),
      name: roomName,
      description,
      host: user.name,
      participants: 1, // Start with just the creator
      active: true,
      created: new Date().toISOString()
    };
    setRooms([...rooms, newRoom]);
  };

  const joinRoom = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      // Create dynamic participants list based on current user and room
      const roomParticipants = [
        { id: user.id, name: user.name, role: 'participant', vote: null }
      ];
      
      // If room has more than 1 participant, add some mock users
      // In real app, this would come from the database
      if (room.participants > 1) {
        const mockUsers = [
          { id: '2', name: 'Alice Johnson', role: 'participant', vote: null },
          { id: '3', name: 'Bob Smith', role: 'participant', vote: null },
          { id: '4', name: 'Carol Wilson', role: 'observer', vote: null },
        ];
        
        // Add mock users up to the room's participant count
        for (let i = 0; i < Math.min(room.participants - 1, mockUsers.length); i++) {
          roomParticipants.push(mockUsers[i]);
        }
      }
      
      setCurrentRoom({
        ...room,
        topic: '',
        participants: roomParticipants
      });
      setCurrentView('room');
      setVotes({});
      setVotingRevealed(false);
      setSelectedCard(null);
    }
  };

  const submitVote = (card) => {
    if (user && currentRoom) {
      setSelectedCard(card);
      setVotes({ ...votes, [user.id]: card });
    }
  };

  const revealVotes = () => {
    setVotingRevealed(true);
  };

  const resetVoting = () => {
    setVotes({});
    setVotingRevealed(false);
    setSelectedCard(null);
  };

  const participants = currentRoom?.participants.filter(p => p.role === 'participant') || [];
  const allVotesSubmitted = participants.length > 0 && participants.every(p => votes[p.id] !== undefined);

  // Login Component
  const LoginView = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <Vote className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan With Poker</h1>
            <p className="text-gray-600">Collaborative scrum planning made simple</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>
            
            <button
              onClick={() => handleLogin(email, password)}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Sign In
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <a href="#" className="text-indigo-600 hover:text-indigo-700 text-sm">
              Don't have an account? Sign up
            </a>
          </div>
        </div>
      </div>
    );
  };

  // Dashboard Component
  const DashboardView = () => {
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [roomDescription, setRoomDescription] = useState('');

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Vote className="w-8 h-8 text-indigo-600 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">Plan With Poker</h1>
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
                  onClick={() => setCurrentView('login')}
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
            <button
              onClick={() => setShowCreateRoom(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Room
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{room.name}</h3>
                    <p className="text-sm text-gray-600">Host: {room.host}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    room.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {room.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <Users className="w-4 h-4 mr-1" />
                  {room.participants} participants
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => joinRoom(room.id)}
                    className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700"
                  >
                    Join Room
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">
                    <Share2 className="w-4 h-4" />
                  </button>
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
                    onClick={() => {
                      createRoom(roomName, roomDescription);
                      setShowCreateRoom(false);
                      setRoomName('');
                      setRoomDescription('');
                    }}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Create Room
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
        </main>
      </div>
    );
  };

  // Room Component
  const RoomView = () => {
    const [topic, setTopic] = useState('');
    const [topicLink, setTopicLink] = useState('');

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
                <h1 className="text-xl font-semibold text-gray-900">{currentRoom?.name}</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 mr-1" />
                  {currentRoom?.participants.length}
                </div>
                <button className="text-gray-500 hover:text-gray-700">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Topic Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Current Topic</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Topic Description</label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows="3"
                      placeholder="Describe what you're estimating..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Link className="w-4 h-4 inline mr-1" />
                      Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={topicLink}
                      onChange={(e) => setTopicLink(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://jira.company.com/ticket/123"
                    />
                  </div>
                </div>
              </div>

              {/* Voting Cards */}
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Choose Your Estimate</h3>
                  {user?.role === 'participant' && (
                    <div className="flex space-x-2">
                      {!votingRevealed && (
                        <button
                          onClick={revealVotes}
                          disabled={!allVotesSubmitted}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            allVotesSubmitted
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Reveal Votes
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
                      disabled={user?.role === 'observer'}
                      className={`aspect-[3/4] rounded-lg border-2 font-bold text-lg transition-all ${
                        selectedCard === card
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-300 hover:border-gray-400 bg-white'
                      } ${
                        user?.role === 'observer' ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
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
                    // Calculate vote distribution
                    const voteDistribution = {};
                    const numericVotes = [];
                    
                    Object.values(votes).forEach(vote => {
                      voteDistribution[vote] = (voteDistribution[vote] || 0) + 1;
                      
                      // Track numeric votes for average calculation
                      if (typeof vote === 'number' && !isNaN(vote)) {
                        numericVotes.push(vote);
                      }
                    });
                    
                    // Calculate average for numeric votes only
                    const average = numericVotes.length > 0 
                      ? (numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length).toFixed(1)
                      : 'N/A';
                    
                    // Sort vote distribution by card value
                    const sortedVotes = Object.entries(voteDistribution).sort(([a], [b]) => {
                      const aNum = typeof a === 'number' ? a : (a === '?' ? 999 : 1000);
                      const bNum = typeof b === 'number' ? b : (b === '?' ? 999 : 1000);
                      return aNum - bNum;
                    });
                    
                    return (
                      <div className="space-y-4">
                        {/* Vote Distribution */}
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
                        
                        {/* Summary Statistics */}
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
            </div>

            {/* Participants */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Participants</h3>
              <div className="space-y-3">
                {currentRoom?.participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        participant.role === 'participant' ? 'bg-green-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">{participant.name}</p>
                        <p className="text-sm text-gray-500 capitalize">
                          {participant.role === 'participant' ? (
                            <UserCheck className="w-3 h-3 inline mr-1" />
                          ) : (
                            <Eye className="w-3 h-3 inline mr-1" />
                          )}
                          {participant.role}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      {votes[participant.id] !== undefined ? (
                        votingRevealed ? (
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm font-medium">
                            {votes[participant.id]}
                          </span>
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )
                      ) : participant.role === 'participant' ? (
                        <Clock className="w-5 h-5 text-gray-400" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  };

  // Analytics Component
  const AnalyticsView = () => {
    const mockAnalytics = {
      totalSessions: 24,
      avgVotingTime: '2.5 min',
      consensusRate: '78%',
      mostUsedCard: '8',
      recentSessions: [
        { id: 1, topic: 'User Authentication', duration: '3 min', finalVote: '8', consensus: true },
        { id: 2, topic: 'Payment Gateway', duration: '5 min', finalVote: '13', consensus: false },
        { id: 3, topic: 'Mobile Responsive', duration: '2 min', finalVote: '5', consensus: true },
      ]
    };

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
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{mockAnalytics.totalSessions}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Voting Time</p>
                  <p className="text-2xl font-bold text-gray-900">{mockAnalytics.avgVotingTime}</p>
                </div>
                <Clock className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Consensus Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{mockAnalytics.consensusRate}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Most Used Card</p>
                  <p className="text-2xl font-bold text-gray-900">{mockAnalytics.mostUsedCard}</p>
                </div>
                <Vote className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
            </div>
            <div className="divide-y">
              {mockAnalytics.recentSessions.map((session) => (
                <div key={session.id} className="p-6 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{session.topic}</p>
                    <p className="text-sm text-gray-600">Duration: {session.duration}</p>
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