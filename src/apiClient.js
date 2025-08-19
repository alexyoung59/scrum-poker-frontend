// src/apiClient.js - Production API Client
import io from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://scrum-poker-backend-production.up.railway.app';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
    this.socket = null;
    this.eventHandlers = {};
    this.currentRoom = null;
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  // Remove authentication token
  removeToken() {
    this.token = null;
    localStorage.removeItem('token');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Get headers with authentication
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Generic fetch wrapper
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Test connection
  async testConnection() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Authentication methods
  async register(userData) {
    const response = await this.request('/api/auth/register', {
      method: 'POST',
      body: userData,
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async login(credentials) {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: credentials,
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  logout() {
    this.removeToken();
    this.disconnect();
  }

  // Room methods
  async getRooms() {
    return this.request('/api/rooms');
  }

  async createRoom(roomData) {
    return this.request('/api/rooms', {
      method: 'POST',
      body: roomData,
    });
  }

  async getRoom(roomId) {
    return this.request(`/api/rooms/${roomId}`);
  }

  async joinRoom(roomId, role = 'participant') {
    return this.request(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      body: { role },
    });
  }

  async joinRoomByCode(inviteCode, role = 'participant') {
    return this.request('/api/rooms/join-by-code', {
      method: 'POST',
      body: { inviteCode, role },
    });
  }

  // Session methods (NEW - for voting sessions)
  async createSession(sessionData) {
    return this.request('/api/sessions', {
      method: 'POST',
      body: sessionData,
    });
  }

  async castVote(sessionId, vote) {
    return this.request(`/api/sessions/${sessionId}/vote`, {
      method: 'POST',
      body: { vote },
    });
  }

  async revealVotes(sessionId) {
    return this.request(`/api/sessions/${sessionId}/reveal`, {
      method: 'POST',
    });
  }

  // Analytics methods
  async getUserAnalytics(timeframe = '30d') {
    return this.request(`/api/analytics/user?timeframe=${timeframe}`);
  }

  // Invitation methods (NEW)
  generateInviteLink(roomId, inviteCode) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/invite/${inviteCode}`;
  }

  async copyInviteLink(roomId, inviteCode) {
    const link = this.generateInviteLink(roomId, inviteCode);
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(link);
      return link;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return link;
    }
  }

  // Socket.io methods (ENHANCED)
  initializeSocket() {
    if (!this.token) {
      console.warn('No authentication token for socket connection');
      return null;
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(API_BASE_URL, {
      auth: {
        token: this.token
      },
      transports: ['websocket', 'polling']
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server via Socket.io');
      this.emit('socket_connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.emit('socket_disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.emit('socket_error', error);
    });

    // Room events (ENHANCED)
    this.socket.on('user_joined', (data) => {
      console.log('User joined room:', data);
      this.emit('user_joined', data);
    });

    this.socket.on('user_connected', (data) => {
      console.log('User connected:', data);
      this.emit('user_connected', data);
    });

    this.socket.on('user_disconnected', (data) => {
      console.log('User disconnected:', data);
      this.emit('user_disconnected', data);
    });

    // Voting events (NEW)
    this.socket.on('session_started', (data) => {
      console.log('New voting session started:', data);
      this.emit('session_started', data);
    });

    this.socket.on('vote_updated', (data) => {
      console.log('Vote updated:', data);
      this.emit('vote_updated', data);
    });

    this.socket.on('votes_revealed', (data) => {
      console.log('Votes revealed:', data);
      this.emit('votes_revealed', data);
    });

    // Room state events (NEW)
    this.socket.on('room_updated', (data) => {
      console.log('Room updated:', data);
      this.emit('room_updated', data);
    });

    return this.socket;
  }

  // Room management via socket
  joinSocketRoom(roomId) {
    if (this.socket) {
      this.socket.emit('join_room', roomId);
      this.currentRoom = roomId;
    }
  }

  leaveSocketRoom(roomId) {
    if (this.socket) {
      this.socket.emit('leave_room', roomId);
      this.currentRoom = null;
    }
  }

  // Real-time voting via socket (NEW)
  emitVoteCast(sessionId, vote) {
    if (this.socket) {
      this.socket.emit('vote_cast', { sessionId, vote });
    }
  }

  emitRevealVotes(sessionId) {
    if (this.socket) {
      this.socket.emit('reveal_votes', { sessionId });
    }
  }

  emitResetVotes(sessionId) {
    if (this.socket) {
      this.socket.emit('reset_votes', { sessionId });
    }
  }

  // Event handling (ENHANCED)
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
    return () => this.off(event, handler); // Return cleanup function
  }

  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods (NEW)
  getCurrentUser() {
    try {
      if (!this.token) return null;
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return {
        id: payload.id,
        name: payload.name,
        email: payload.email
      };
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  // Cleanup
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers = {};
    this.currentRoom = null;
  }

  // Connection status
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;