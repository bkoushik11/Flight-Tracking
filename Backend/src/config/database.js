const mongoose = require('mongoose');
require('dotenv').config();

/**
 * MongoDB connection configuration
 */
class Database {
  constructor() {
    this.connection = null;
  }

  /**
   * Connect to MongoDB
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Flight';
      
      console.log('🔄 Connecting to MongoDB...');
      console.log('📍 MongoDB URI:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
      
      this.connection = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000 // Close sockets after 45s of inactivity
      });

      console.log('✅ MongoDB connected successfully');
      console.log('📂 Database:', this.connection.connection.db.databaseName);
      console.log('🏠 Host:', this.connection.connection.host);
      console.log('🔌 Port:', this.connection.connection.port);

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      
      // If MongoDB is not running, provide helpful instructions
      if (error.message.includes('ECONNREFUSED')) {
        console.log('');
        console.log('🔧 MongoDB Connection Help:');
        console.log('   1. Make sure MongoDB is installed and running');
        console.log('   2. Start MongoDB service:');
        console.log('      Windows: net start MongoDB');
        console.log('      macOS: brew services start mongodb-community');
        console.log('      Linux: sudo systemctl start mongod');
        console.log('   3. Or use MongoDB Atlas (cloud): https://cloud.mongodb.com');
        console.log('');
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        console.log('🔌 MongoDB disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
    }
  }

  /**
   * Get connection status
   * @returns {boolean}
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      if (!this.isConnected()) {
        throw new Error('Database not connected');
      }

      const stats = await mongoose.connection.db.stats();
      return {
        database: mongoose.connection.db.databaseName,
        collections: stats.collections,
        dataSize: this.formatBytes(stats.dataSize),
        indexSize: this.formatBytes(stats.indexSize),
        totalSize: this.formatBytes(stats.storageSize)
      };
    } catch (error) {
      console.error('❌ Error getting database stats:', error.message);
      return null;
    }
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes 
   * @returns {string}
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
module.exports = new Database();