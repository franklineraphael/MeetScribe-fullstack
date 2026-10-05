/**
 * Zoom API helpers
 * In production: use real OAuth + Zoom REST API
 * Docs: https://developers.zoom.us/docs/api/
 */

const ZOOM_API = 'https://api.zoom.us/v2';

export function getZoomAuthUrl(state) {
  const clientId = process.env.ZOOM_CLIENT_ID || 'mock_zoom_client_id';
  const redirectUri = encodeURIComponent(
    process.env.ZOOM_REDIRECT_URI || 'http://localhost:5173/app/settings?zoom=callback'
  );
  // Real URL would be:
  // https://zoom.us/oauth/authorize?response_type=code&client_id=...&redirect_uri=...&state=...
  return {
    authUrl: `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`,
    mock: !process.env.ZOOM_CLIENT_ID
  };
}

export async function exchangeZoomCode(code) {
  // Production:
  // POST https://zoom.us/oauth/token
  // grant_type=authorization_code&code=...&redirect_uri=...
  if (!process.env.ZOOM_CLIENT_ID) {
    return {
      access_token: `mock_zoom_access_${Date.now()}`,
      refresh_token: `mock_zoom_refresh_${Date.now()}`,
      expires_in: 3600,
      scope: 'meeting:write recording:write user:read'
    };
  }
  // Real implementation would use axios + Basic auth with client_id:client_secret
  throw new Error('Configure ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET for live OAuth');
}

export async function refreshZoomToken(refreshToken) {
  if (!process.env.ZOOM_CLIENT_ID) {
    return {
      access_token: `mock_zoom_access_refreshed_${Date.now()}`,
      expires_in: 3600
    };
  }
  throw new Error('Configure Zoom credentials');
}

export async function listUpcomingMeetings(accessToken) {
  // GET /users/me/meetings?type=upcoming
  if (!process.env.ZOOM_CLIENT_ID) {
    const now = Date.now();
    return [
      {
        id: 'zoom_mtg_1001',
        topic: 'Weekly Product Sync',
        start_time: new Date(now + 3600000).toISOString(),
        duration: 30,
        join_url: 'https://zoom.us/j/1001',
        status: 'waiting'
      },
      {
        id: 'zoom_mtg_1002',
        topic: 'Design Review',
        start_time: new Date(now + 86400000).toISOString(),
        duration: 45,
        join_url: 'https://zoom.us/j/1002',
        status: 'waiting'
      },
      {
        id: 'zoom_mtg_1003',
        topic: 'Sprint Planning',
        start_time: new Date(now + 2 * 86400000).toISOString(),
        duration: 60,
        join_url: 'https://zoom.us/j/1003',
        status: 'waiting'
      }
    ];
  }
  // Real: axios.get(`${ZOOM_API}/users/me/meetings`, { headers: { Authorization: `Bearer ${accessToken}` } })
  throw new Error('Configure Zoom credentials');
}

export async function startCloudRecording(accessToken, meetingId) {
  // PUT /meetings/{meetingId}/recordings/status
  // body: { action: "start" }
  if (!process.env.ZOOM_CLIENT_ID) {
    return {
      success: true,
      meetingId,
      recordingId: `rec_${Date.now()}`,
      status: 'recording',
      message: 'Cloud recording started (mock)'
    };
  }
  throw new Error('Configure Zoom credentials');
}

export async function stopCloudRecording(accessToken, meetingId) {
  if (!process.env.ZOOM_CLIENT_ID) {
    return {
      success: true,
      meetingId,
      status: 'stopped',
      recordingFiles: [
        {
          id: `file_${Date.now()}`,
          file_type: 'MP4',
          download_url: `https://zoom.us/rec/download/mock_${meetingId}`,
          file_size: 52428800,
          recording_start: new Date(Date.now() - 1800000).toISOString(),
          recording_end: new Date().toISOString()
        }
      ]
    };
  }
  throw new Error('Configure Zoom credentials');
}

export async function getRecordingDetails(accessToken, meetingId) {
  if (!process.env.ZOOM_CLIENT_ID) {
    return {
      meetingId,
      recording_files: [
        {
          id: `file_${meetingId}`,
          file_type: 'MP4',
          download_url: `https://zoom.us/rec/download/mock_${meetingId}`,
          play_url: `https://zoom.us/rec/play/mock_${meetingId}`,
          file_size: 48234567,
          recording_type: 'shared_screen_with_speaker_view'
        }
      ],
      duration: 28
    };
  }
  throw new Error('Configure Zoom credentials');
}
