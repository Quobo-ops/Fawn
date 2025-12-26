import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.warn('Twilio credentials not configured');
}

export const twilioClient = accountSid && authToken
  ? Twilio(accountSid, authToken)
  : null;

export function requireTwilioClient() {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }
  return twilioClient;
}
