const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('fawn_token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('fawn_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fawn_token');
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async register(data: {
    email: string;
    password: string;
    name?: string;
    phoneNumber: string;
  }) {
    const result = await this.request<{ user: User; token: string }>(
      '/api/users/register',
      { method: 'POST', body: JSON.stringify(data) }
    );
    this.setToken(result.token);
    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request<{ user: User; token: string }>(
      '/api/users/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    this.setToken(result.token);
    return result;
  }

  async getMe() {
    return this.request<UserProfile>('/api/users/me');
  }

  async updateProfile(data: Partial<UserProfile>) {
    return this.request('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Companion
  async getCompanion() {
    return this.request<Companion>('/api/companions');
  }

  async updateCompanion(data: Partial<Companion>) {
    return this.request('/api/companions', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async resetCompanion() {
    return this.request('/api/companions/reset', { method: 'POST' });
  }

  // Memories
  async searchMemories(query: string) {
    return this.request<{ results: Memory[] }>(
      `/api/memories/search?q=${encodeURIComponent(query)}`
    );
  }

  async getMemories(options?: { category?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (options?.category) params.set('category', options.category);
    if (options?.limit) params.set('limit', String(options.limit));
    return this.request<{ memories: Memory[] }>(
      `/api/memories?${params.toString()}`
    );
  }

  async createMemory(data: { content: string; category: string; importance?: number }) {
    return this.request('/api/memories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Goals
  async getGoals(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<{ goals: Goal[] }>(`/api/goals${params}`);
  }

  async createGoal(data: Partial<Goal>) {
    return this.request('/api/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logProgress(goalId: string, data: { value?: number; note?: string }) {
    return this.request(`/api/goals/${goalId}/progress`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Events
  async getEvents(start?: Date, end?: Date) {
    const params = new URLSearchParams();
    if (start) params.set('start', start.toISOString());
    if (end) params.set('end', end.toISOString());
    return this.request<{ events: Event[] }>(`/api/events?${params.toString()}`);
  }

  async createEvent(data: Partial<Event>) {
    return this.request('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();

// Types
export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface UserProfile extends User {
  phoneNumber?: string;
  timezone?: string;
  companionNumber?: string;
  onboardingComplete?: boolean;
  createdAt: string;
}

export interface Companion {
  id: string;
  name: string;
  pronouns: string;
  personality: {
    warmth: number;
    humor: number;
    directness: number;
    formality: number;
    curiosity: number;
    encouragement: number;
    traits: string[];
    customTraits?: string;
  };
  rules: {
    avoidTopics?: string[];
    sensitiveTopics?: string[];
    neverDo?: string[];
    shouldProactively?: string[];
    holdAccountable?: boolean;
    accountabilityLevel?: 'gentle' | 'moderate' | 'firm';
  };
  communicationStyle: {
    emojiFrequency: 'never' | 'rare' | 'moderate' | 'frequent';
    brevity: 'very_short' | 'short' | 'medium' | 'detailed';
    addressStyle: 'name' | 'nickname' | 'none';
    nickname?: string;
  };
  customInstructions?: string;
}

export interface Memory {
  id: string;
  content: string;
  category: string;
  importance: number;
  tags?: string[];
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: number;
  targetDate?: string;
  progressPercentage: number;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  status: string;
}
