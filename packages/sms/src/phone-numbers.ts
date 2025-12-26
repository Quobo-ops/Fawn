import { requireTwilioClient } from './twilio-client';

export interface PhoneNumberOptions {
  areaCode?: string;
  country?: string;
  smsCapable?: boolean;
  voiceCapable?: boolean;
}

export interface ProvisionedNumber {
  phoneNumber: string;
  sid: string;
  friendlyName: string;
}

/**
 * Search for available phone numbers in a given area
 */
export async function searchAvailableNumbers(
  options: PhoneNumberOptions = {}
): Promise<{ phoneNumber: string; friendlyName: string }[]> {
  const client = requireTwilioClient();
  const { areaCode, country = 'US', smsCapable = true } = options;

  const searchParams: Record<string, unknown> = {
    smsEnabled: smsCapable,
    limit: 10,
  };

  if (areaCode) {
    searchParams.areaCode = areaCode;
  }

  const numbers = await client.availablePhoneNumbers(country)
    .local
    .list(searchParams);

  return numbers.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
  }));
}

/**
 * Provision a new phone number for a user's AI companion
 */
export async function provisionPhoneNumber(
  phoneNumber: string,
  webhookUrl: string,
  friendlyName?: string
): Promise<ProvisionedNumber> {
  const client = requireTwilioClient();

  const incoming = await client.incomingPhoneNumbers.create({
    phoneNumber,
    friendlyName: friendlyName || 'Fawn AI Companion',
    smsUrl: webhookUrl,
    smsMethod: 'POST',
  });

  return {
    phoneNumber: incoming.phoneNumber,
    sid: incoming.sid,
    friendlyName: incoming.friendlyName,
  };
}

/**
 * Update webhook URL for an existing phone number
 */
export async function updatePhoneNumberWebhook(
  sid: string,
  webhookUrl: string
): Promise<void> {
  const client = requireTwilioClient();

  await client.incomingPhoneNumbers(sid).update({
    smsUrl: webhookUrl,
    smsMethod: 'POST',
  });
}

/**
 * Release a phone number back to Twilio
 */
export async function releasePhoneNumber(sid: string): Promise<void> {
  const client = requireTwilioClient();
  await client.incomingPhoneNumbers(sid).remove();
}

/**
 * Get details about a provisioned phone number
 */
export async function getPhoneNumberDetails(sid: string) {
  const client = requireTwilioClient();
  return await client.incomingPhoneNumbers(sid).fetch();
}
