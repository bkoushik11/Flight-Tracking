import AuthService from './authService';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

export interface RecordingMeta {
  _id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  durationMs?: number;
  createdAt: string;
}

export const recordingService = {
  async uploadRecording(blob: Blob, opts: { title?: string; flightId?: string; flightNumber?: string; durationMs?: number }) {
    const formData = new FormData();
    formData.append('video', blob, opts.title ? `${opts.title}.webm` : 'recording.webm');
    if (opts.title) formData.append('title', opts.title);
    if (opts.flightId) formData.append('flightId', opts.flightId);
    if (opts.flightNumber) formData.append('flightNumber', opts.flightNumber);
    if (opts.durationMs !== undefined) formData.append('durationMs', String(opts.durationMs));

    const token = AuthService.getStoredToken();
    const res = await fetch(`${API_BASE_URL}/recordings`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Upload failed: ${res.status} ${res.statusText} ${text}`.trim());
    }
    return res.json();
  },

  async listRecordings(): Promise<{ success: boolean; data: RecordingMeta[] }> {
    const token = AuthService.getStoredToken();
    // Show all recordings to surface data even if ownership/userId mismatches in dev
    const url = token
      ? `${API_BASE_URL}/recordings?all=true&token=${encodeURIComponent(token)}`
      : `${API_BASE_URL}/recordings?all=true`;
    console.log('[recordingService] GET', url);
    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    console.log('[recordingService] status', res.status);
    if (!res.ok) throw new Error('Failed to load recordings');
    const json = await res.json();
    console.log('[recordingService] payload', json);
    // Normalize various response shapes
    const normalized = Array.isArray(json)
      ? { success: true, data: json }
      : (json && typeof json === 'object' && 'data' in json)
        ? json
        : { success: true, data: [] };
    return normalized as { success: boolean; data: RecordingMeta[] };
  },

  async deleteRecording(id: string): Promise<{ success: boolean; message: string }> {
    const token = AuthService.getStoredToken();
    const res = await fetch(`${API_BASE_URL}/recordings/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Delete failed: ${res.status} ${res.statusText} ${text}`.trim());
    }
    
    const json = await res.json();
    return json as { success: boolean; message: string };
  },

  getStreamUrl(id: string) {
    const token = AuthService.getStoredToken() || '';
    return `${API_BASE_URL}/recordings/${id}/stream?all=true&token=${encodeURIComponent(token)}`;
  }
};