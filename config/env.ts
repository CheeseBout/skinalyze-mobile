// Configuration for external services
export const config = {
  // API Base URL
  API_BASE_URL: process.env.EXPO_PUBLIC_BASE_API_URL || 'http://192.168.1.11:3000/api/v1',
  // API_BASE_URL: process.env.EXPO_PUBLIC_BASE_API_URL || 'http://192.168.1.249:3000/api/v1',
  
  // Goong Maps API Keys (Vietnam mapping service)
  // Sign up at: https://account.goong.io/
  GOONG_API_KEY: process.env.EXPO_PUBLIC_GOONG_API_KEY || 'your-goong-api-key-here',
  GOONG_MAP_KEY: process.env.EXPO_PUBLIC_GOONG_MAP_KEY || 'your-goong-map-key-here',
  
  // Goong API endpoints
  GOONG_BASE_URL: 'https://rsapi.goong.io',
  
  // Tracking settings
  TRACKING_POLL_INTERVAL: 10000, // 10 seconds
  LOCATION_CACHE_DURATION: 300000, // 5 minutes
  
  // WebSocket (optional for real-time updates)
  WEBSOCKET_URL: process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'http://192.168.1.249:3000',
};

export default config;
