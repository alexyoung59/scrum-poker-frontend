// src/InviteHandler.jsx - Handle invite links
import React, { useEffect } from 'react';
import apiClient from './apiClient.js';

const InviteHandler = ({ inviteCode, onJoinRoom, onError }) => {
  useEffect(() => {
    const handleInvite = async () => {
      if (!inviteCode) return;
      
      try {
        // Check if user is logged in
        if (!apiClient.isAuthenticated()) {
          // Store invite code for after login
          localStorage.setItem('pendingInvite', inviteCode);
          onError('Please log in first to join the room');
          return;
        }
        
        // Join room by invite code
        const room = await apiClient.joinRoomByCode(inviteCode);
        onJoinRoom(room);
      } catch (error) {
        onError('Failed to join room: ' + error.message);
      }
    };

    handleInvite();
  }, [inviteCode, onJoinRoom, onError]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Joining room...</p>
      </div>
    </div>
  );
};

export default InviteHandler;