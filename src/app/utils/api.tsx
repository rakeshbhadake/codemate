import { publicAnonKey, supabaseUrl } from './supabase/info';
import { createClient } from './supabase/client';

const API_BASE = `${supabaseUrl}/functions/v1/make-server-9386b22c`;

export async function apiCall(endpoint: string, options: RequestInit = {}, requireAuth: boolean = true) {
  const accessToken = localStorage.getItem('accessToken');
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken || publicAnonKey}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));

      // 404 = route not yet deployed; log as warn not error so console stays clean
      if (response.status === 404) {
        console.warn(`API 404: ${options.method || 'GET'} ${endpoint} — route may not be deployed yet`);
      } else if (response.status === 401) {
        try {
          const supabase = createClient();
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            localStorage.setItem('accessToken', data.session.access_token);
          } else {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
          }
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
        }
      } else {
        console.error(`API ${response.status}: ${options.method || 'GET'} ${endpoint}`, error);
      }

      throw new Error(error.error || `API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Make sure the server is running.');
    }
    throw error;
  }
}

// Profile API
export const profileAPI = {
  get: (userId: string) => apiCall(`/profile/${userId}`),
  update: (updates: any) => apiCall('/profile', {
    method: 'PUT',
    body: JSON.stringify(updates)
  }),
  checkUsername: (username: string) => apiCall(`/profile/check-username/${username}`),
  uploadPicture: async (file: File) => {
    const accessToken = localStorage.getItem('accessToken');
    const formData = new FormData();
    formData.append('picture', file);
    
    const response = await fetch(`${API_BASE}/profile/picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken || publicAnonKey}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Failed to upload picture');
    }
    
    return response.json();
  },
  deletePicture: () => apiCall('/profile/picture', { method: 'DELETE' })
};

// Users API
export const usersAPI = {
  getById: (userId: string) => apiCall(`/users/${userId}`),
  search: (query: string) => apiCall(`/users/search?q=${encodeURIComponent(query)}`)
};

// Social API
export const socialAPI = {
  follow: (userId: string) => apiCall(`/social/follow/${userId}`, { method: 'POST' }),
  unfollow: (userId: string) => apiCall(`/social/follow/${userId}`, { method: 'DELETE' }),
  getFollowers: (userId: string) => apiCall(`/social/followers/${userId}`),
  getFollowing: (userId: string) => apiCall(`/social/following/${userId}`)
};

// Events API
export const eventsAPI = {
  getAll: () => apiCall('/events'),
  getOne: (eventId: string) => apiCall(`/events/${eventId}`),
  create: (eventData: any, bannerFile?: File) => {
    const accessToken = localStorage.getItem('accessToken');
    if (bannerFile) {
      const formData = new FormData();
      Object.entries(eventData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      formData.append('banner', bannerFile);
      return fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken || publicAnonKey}` },
        body: formData
      }).then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Failed to create event' }));
          throw new Error(err.error || 'Failed to create event');
        }
        return res.json();
      });
    }
    return apiCall('/events', { method: 'POST', body: JSON.stringify(eventData) });
  },
  delete: (eventId: string) => apiCall(`/events/${eventId}`, { method: 'DELETE' }),
  like: (eventId: string) => apiCall(`/events/${eventId}/like`, { method: 'POST' }),
  unlike: (eventId: string) => apiCall(`/events/${eventId}/like`, { method: 'DELETE' }),
  comment: (eventId: string, text: string) => apiCall(`/events/${eventId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text })
  }),
  getComments: (eventId: string) => apiCall(`/events/${eventId}/comments`),
  register: (eventId: string, data: any) => apiCall(`/events/${eventId}/register`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getRegistrations: (eventId: string) => apiCall(`/events/${eventId}/registrations`),
  updateRegistration: (eventId: string, regId: string, data: any) => apiCall(`/events/${eventId}/registrations/${regId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
};

// Messaging API
export const messagingAPI = {
  send: (recipientId: string, text: string) => apiCall('/messages/send', {
    method: 'POST',
    body: JSON.stringify({ recipientId, text })
  }),
  getMessages: (otherUserId: string) => apiCall(`/messages/${otherUserId}`),
  getConversations: () => apiCall('/messages/conversations/list')
};

// Matching API
export const matchingAPI = {
  discover: () => apiCall('/users/discover'),
  aiSuggest: (query: string, filters: any) => apiCall('/matching/ai-suggest', {
    method: 'POST',
    body: JSON.stringify({ query, filters })
  }),
  chatbot: (message: string) => apiCall('/matching/chatbot', {
    method: 'POST',
    body: JSON.stringify({ message })
  })
};

// Projects API
export const projectsAPI = {
  getByUser: (userId: string) => apiCall(`/projects/user/${userId}`),
  getOne: (projectId: string) => apiCall(`/projects/${projectId}`),
  create: (projectData: FormData) => {
    const accessToken = localStorage.getItem('accessToken');
    return fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken || publicAnonKey}` },
      body: projectData
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create project' }));
        throw new Error(err.error || 'Failed to create project');
      }
      return res.json();
    });
  },
  update: (projectId: string, updates: any) => apiCall(`/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  }),
  delete: (projectId: string) => apiCall(`/projects/${projectId}`, { method: 'DELETE' }),
};

// Posts API
export const postsAPI = {
  getAll: () => apiCall('/posts'),
  getOne: (postId: string) => apiCall(`/posts/${postId}`),
  getByUser: (userId: string) => apiCall(`/posts/user/${userId}`),
  create: (postData: FormData) => {
    const accessToken = localStorage.getItem('accessToken');
    return fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken || publicAnonKey}`
      },
      body: postData
    }).then(async response => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Failed to create post');
      }
      return response.json();
    });
  },
  delete: (postId: string) => apiCall(`/posts/${postId}`, { method: 'DELETE' }),
  update: (postId: string, updates: any) => apiCall(`/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  }),
  like: (postId: string) => apiCall(`/posts/${postId}/like`, { method: 'POST' }),
  unlike: (postId: string) => apiCall(`/posts/${postId}/like`, { method: 'DELETE' }),
  comment: (postId: string, text: string) => apiCall(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text })
  }),
  getComments: (postId: string) => apiCall(`/posts/${postId}/comments`),
  bookmark: (postId: string) => apiCall(`/posts/${postId}/bookmark`, { method: 'POST' }),
  unbookmark: (postId: string) => apiCall(`/posts/${postId}/bookmark`, { method: 'DELETE' }),
  getBookmarks: () => apiCall('/posts/bookmarks'),
  getTrending: () => apiCall('/posts/trending')
};
