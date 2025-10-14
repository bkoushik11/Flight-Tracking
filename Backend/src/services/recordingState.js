// Global recording state shared across backend modules
// Tracks flightIds that should have their positions persisted

const recordingFlights = new Set();

function startRecordingFlight(flightId) {
  if (flightId) recordingFlights.add(String(flightId));
}

function stopRecordingFlight(flightId) {
  if (flightId) recordingFlights.delete(String(flightId));
}

function isRecordingFlight(flightId) {
  return recordingFlights.has(String(flightId));
}

function listRecordingFlights() {
  return Array.from(recordingFlights);
}

module.exports = {
  recordingFlights,
  startRecordingFlight,
  stopRecordingFlight,
  isRecordingFlight,
  listRecordingFlights,
};


