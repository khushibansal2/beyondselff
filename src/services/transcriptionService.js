// src/services/transcriptionService.js
import { getAuthHeaders } from './apiConfig'; // We will define this if needed or just use localStorage

export const transcribeAudio = async (audioBlob, mockText = null) => {
  const auth = localStorage.getItem('dt_auth');
  const token = auth ? JSON.parse(auth).token : '';

  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  
  if (mockText) {
    formData.append('mockText', mockText);
  }

  try {
    const response = await fetch('http://localhost:8080/api/transcribe/audio', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Do NOT set Content-Type here, let the browser set it with the boundary for FormData
      },
      body: formData
    });

    if (!response.ok) {
      if (response.status === 413) throw new Error('Audio file too large. Max 5MB.');
      if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a moment.');
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const data = await response.json();
    return data; // { transcript, confidence, provider, timestamp }
  } catch (err) {
    console.error('Transcription service error:', err);
    throw err;
  }
};
