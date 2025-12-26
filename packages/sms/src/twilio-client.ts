import Twilio from 'twilio';

// Lazy initialization - client is created on first use after env vars are loaded
let twilioClient: ReturnType<typeof Twilio> | null = null;

function getClient(): ReturnType<typeof Twilio> | null {
  if (twilioClient) return twilioClient;
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    return null;
  }
  
  twilioClient = Twilio(accountSid, authToken);
  return twilioClient;
}

export function requireTwilioClient() {
  const client = getClient();
  if (!client) {
    throw new Error('Twilio client not initialized. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }
  return client;
}

// For backwards compatibility
export { twilioClient };
