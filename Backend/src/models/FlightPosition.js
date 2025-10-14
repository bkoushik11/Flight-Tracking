const mongoose = require('mongoose');

const flightPositionSchema = new mongoose.Schema({
  flightId: {
    type: String,
    required: true,
    index: true
  },
  positions: [{
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    heading: {
      type: Number,
      default: 0
    },
    altitude: {
      type: Number,
      default: 0
    },
    speed: {
      type: Number,
      default: 0
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// FIFO Stack implementation - keep only last 5000 positions
// Save positions when lat/long changes, handle floating point precision
flightPositionSchema.methods.addPosition = function(lat, lng, heading, altitude, speed) {
  // Check if this is the first position or if coordinates have changed
  const lastPosition = this.positions[this.positions.length - 1];
  
  // Handle floating point precision issues - check if coordinates have changed
  const hasPositionChanged = !lastPosition || 
    Math.abs(lastPosition.latitude - lat) > 1e-10 || 
    Math.abs(lastPosition.longitude - lng) > 1e-10;

  if (!hasPositionChanged) {
    // Return without saving if coordinates haven't changed (within precision tolerance)
    return Promise.resolve({
      saved: false,
      reason: 'Coordinates unchanged (within precision tolerance)',
      document: this
    });
  }

  // Create new position when coordinates change
  const newPosition = {
    latitude: lat,
    longitude: lng,
    heading: heading || 0,
    altitude: altitude || 0,
    speed: speed || 0,
    timestamp: new Date()
  };

  // Add new position to array
  this.positions.push(newPosition);

  // Maintain FIFO - keep only last 5000 positions
  if (this.positions.length > 5000) {
    this.positions = this.positions.slice(-5000);
  }

  // Update timestamp
  this.updatedAt = new Date();
  
  // SAVE TO MONGODB
  return this.save().then(savedDoc => ({
    saved: true,
    reason: 'Coordinates changed',
    document: savedDoc,
    positionCount: savedDoc.positions.length
  }));
};

// Method to check if position should be added - handle floating point precision
flightPositionSchema.methods.shouldAddPosition = function(lat, lng) {
  const lastPosition = this.positions[this.positions.length - 1];
  
  if (!lastPosition) {
    return {
      shouldAdd: true,
      reason: 'First position for flight',
      changes: { latitude: 'N/A', longitude: 'N/A' }
    };
  }
  
  // Handle floating point precision issues
  const latDiff = Math.abs(lastPosition.latitude - lat);
  const lngDiff = Math.abs(lastPosition.longitude - lng);
  const latChanged = latDiff > 1e-10;
  const lngChanged = lngDiff > 1e-10;
  const hasPositionChanged = latChanged || lngChanged;
  
  return {
    shouldAdd: hasPositionChanged,
    reason: hasPositionChanged ? 'Coordinates changed' : 'Coordinates unchanged (within precision tolerance)',
    changes: {
      latitude: latChanged ? `changed by ${latDiff}` : 'unchanged',
      longitude: lngChanged ? `changed by ${lngDiff}` : 'unchanged'
    }
  };
};

// Get positions as array for easy processing
flightPositionSchema.methods.getPositionsArray = function() {
  return this.positions.map(pos => ({
    lat: pos.latitude,
    lng: pos.longitude,
    heading: pos.heading,
    altitude: pos.altitude,
    speed: pos.speed,
    timestamp: pos.timestamp
  }));
};

// Get positions for specific time range
flightPositionSchema.methods.getPositionsInRange = function(startTime, endTime) {
  return this.positions
    .filter(pos => pos.timestamp >= startTime && pos.timestamp <= endTime)
    .map(pos => ({
      lat: pos.latitude,
      lng: pos.longitude,
      heading: pos.heading,
      altitude: pos.altitude,
      speed: pos.speed,
      timestamp: pos.timestamp
    }));
};

// Static method to find or create flight position record
flightPositionSchema.statics.findOrCreate = async function(flightId) {
  let flightPosition = await this.findOne({ flightId });
  if (!flightPosition) {
    flightPosition = new this({ flightId, positions: [] });
    await flightPosition.save();
  } else {
  }
  return flightPosition;
};

// Static method to get all positions for a flight
flightPositionSchema.statics.getFlightPositions = async function(flightId) {
  const flightPosition = await this.findOne({ flightId });
  return flightPosition ? flightPosition.getPositionsArray() : [];
};

// Save position when lat/long changes, handle floating point precision
flightPositionSchema.statics.addPositionIfChanged = async function(flightId, lat, lng, heading, altitude, speed) {
  try {
    // Get or create flight position document
    const flightPosition = await this.findOrCreate(flightId);
    
    // Check if we should add this position (handle floating point precision)
    const shouldAddCheck = flightPosition.shouldAddPosition(lat, lng);
    
    if (!shouldAddCheck.shouldAdd) {
      return {
        success: true,
        saved: false,
        reason: shouldAddCheck.reason,
        changes: shouldAddCheck.changes,
        flightId: flightId,
        currentPositions: flightPosition.positions.length
      };
    }
    
    // Add position (this will save to MongoDB)
    const result = await flightPosition.addPosition(lat, lng, heading, altitude, speed);
    
    return {
      success: true,
      saved: result.saved,
      reason: result.reason,
      flightId: flightId,
      currentPositions: result.positionCount || flightPosition.positions.length
    };
    
  } catch (error) {
    console.error(`💥 Error processing position for flight ${flightId}:`, error.message);
    return {
      success: false,
      saved: false,
      reason: `Error: ${error.message}`,
      flightId: flightId,
      error: error
    };
  }
};

// Static method to get position statistics for a flight
flightPositionSchema.statics.getPositionStats = async function(flightId) {
  const flightPosition = await this.findOne({ flightId });
  if (!flightPosition || flightPosition.positions.length === 0) {
    return {
      flightId,
      totalPositions: 0,
      firstPosition: null,
      lastPosition: null,
      timeSpan: 0,
      distanceTraveled: 0
    };
  }

  const positions = flightPosition.positions;
  const firstPos = positions[0];
  const lastPos = positions[positions.length - 1];
  
  // Calculate total distance traveled
  let totalDistance = 0;
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const distance = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    totalDistance += distance;
  }

  return {
    flightId,
    totalPositions: positions.length,
    firstPosition: {
      lat: firstPos.latitude,
      lng: firstPos.longitude,
      timestamp: firstPos.timestamp
    },
    lastPosition: {
      lat: lastPos.latitude,
      lng: lastPos.longitude,
      timestamp: lastPos.timestamp
    },
    timeSpan: lastPos.timestamp - firstPos.timestamp,
    distanceTraveled: totalDistance
  };
};

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Static method to clear old positions (cleanup)
flightPositionSchema.statics.cleanupOldPositions = async function(daysOld = 7) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const result = await this.deleteMany({ updatedAt: { $lt: cutoffDate } });
  return result;
};

// NEW: Method to get coordinate change statistics
flightPositionSchema.statics.getChangeStats = async function(flightId) {
  const flightPosition = await this.findOne({ flightId });
  if (!flightPosition || flightPosition.positions.length < 2) {
    return { flightId, totalChanges: 0, averageChange: 0 };
  }
  
  let totalLatChange = 0;
  let totalLngChange = 0;
  let changeCount = 0;
  
  for (let i = 1; i < flightPosition.positions.length; i++) {
    const prev = flightPosition.positions[i - 1];
    const curr = flightPosition.positions[i];
    totalLatChange += Math.abs(curr.latitude - prev.latitude);
    totalLngChange += Math.abs(curr.longitude - prev.longitude);
    changeCount++;
  }
  
  return {
    flightId,
    totalChanges: changeCount,
    averageLatChange: totalLatChange / changeCount,
    averageLngChange: totalLngChange / changeCount,
    totalPositions: flightPosition.positions.length
  };
};

module.exports = mongoose.model('FlightPosition', flightPositionSchema);
