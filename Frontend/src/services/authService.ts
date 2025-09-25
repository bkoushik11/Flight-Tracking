const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */
class AuthService {
  /**
   * Make authenticated API request
   * @param {string} url - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} API response
   */
  static async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    const token = localStorage.getItem('auth_token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      // Check for new token in response headers
      const newToken = response.headers.get('X-New-Token');
      if (newToken) {
        localStorage.setItem('auth_token', newToken);
      }

      return data;
    } catch (error: any) {
      console.error('API request error:', error);
      
      // Handle token expiration
      if (error.message.includes('Token expired') || error.message.includes('Invalid token')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.reload();
      }
      
      throw error;
    }
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration response
   */
  static async register(userData: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) {
    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      if (response.success && response.data) {
        // Store token and user data
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  /**
   * Login user
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} Login response
   */
  static async login(credentials: {
    email: string;
    password: string;
  }) {
    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      if (response.success && response.data) {
        // Store token and user data
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  }

  /**
   * Logout user
   * @returns {Promise<void>}
   */
  static async logout() {
    try {
      // Call logout endpoint to log the action
      await this.makeRequest('/auth/logout', {
        method: 'POST'
      });
    } catch (error: any) {
      console.warn('Logout endpoint failed:', error.message);
    } finally {
      // Always clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile
   */
  static async getProfile() {
    try {
      const response = await this.makeRequest('/auth/profile');
      
      if (response.success && response.data) {
        // Update stored user data
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data.user;
      }
      
      throw new Error('Failed to fetch profile');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch profile');
    }
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated user profile
   */
  static async updateProfile(updates: {
    fullName?: string;
    preferences?: any;
    favoriteAirports?: string[];
  }) {
    try {
      const response = await this.makeRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (response.success && response.data) {
        // Update stored user data
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data.user;
      }
      
      throw new Error('Failed to update profile');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  /**
   * Verify if current token is valid
   * @returns {Promise<boolean>} Token validity
   */
  static async verifyToken(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/auth/verify');
      
      if (response.success && response.data) {
        // Update stored user data
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.warn('Token verification failed:', error.message);
      return false;
    }
  }

  /**
   * Get stored user data
   * @returns {Object|null} User data or null
   */
  static getStoredUser() {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }

  /**
   * Get stored auth token
   * @returns {string|null} Auth token or null
   */
  static getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  static isAuthenticated(): boolean {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }

  /**
   * Initialize authentication state on app start
   * @returns {Promise<boolean>} Authentication status
   */
  static async initializeAuth(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    // Verify token is still valid
    const isValid = await this.verifyToken();
    
    if (!isValid) {
      // Clear invalid data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      return false;
    }

    return true;
  }
}

export default AuthService;