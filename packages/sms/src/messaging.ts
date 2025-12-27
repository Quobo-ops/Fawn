import { requireTwilioClient } from './twilio-client';
import { validateRequest } from 'twilio';

// SMS message limit is 1600 characters for concatenated messages
const MAX_SMS_LENGTH = 1600;
const SINGLE_SMS_LENGTH = 160;

export interface SendMessageOptions {
  from: string;
  to: string;
  body: string;
  mediaUrl?: string[];
  statusCallback?: string;
}

export interface SentMessage {
  sid: string;
  status: string;
  dateCreated: Date;
  numSegments: string;
}

/**
 * Send an SMS message
 */
export async function sendSms(options: SendMessageOptions): Promise<SentMessage> {
  const client = requireTwilioClient();

  const message = await client.messages.create({
    from: options.from,
    to: options.to,
    body: options.body,
    mediaUrl: options.mediaUrl,
    statusCallback: options.statusCallback,
  });

  return {
    sid: message.sid,
    status: message.status,
    dateCreated: message.dateCreated,
    numSegments: message.numSegments,
  };
}

/**
 * Send a long message, splitting if necessary
 * Returns array of message SIDs
 */
export async function sendLongMessage(
  options: Omit<SendMessageOptions, 'body'> & { body: string }
): Promise<SentMessage[]> {
  const { body, ...rest } = options;

  // If message fits in one SMS, send directly
  if (body.length <= MAX_SMS_LENGTH) {
    const result = await sendSms({ ...rest, body });
    return [result];
  }

  // Split into chunks, trying to break at sentence boundaries
  const chunks = splitMessage(body, MAX_SMS_LENGTH);
  const results: SentMessage[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const prefix = chunks.length > 1 ? `(${i + 1}/${chunks.length}) ` : '';
    const result = await sendSms({
      ...rest,
      body: prefix + chunks[i],
    });
    results.push(result);
  }

  return results;
}

/**
 * Split a long message into chunks, trying to break at natural boundaries
 */
function splitMessage(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find a good breaking point
    let breakPoint = maxLength;

    // Try to break at a paragraph
    const paragraphBreak = remaining.lastIndexOf('\n\n', maxLength);
    if (paragraphBreak > maxLength * 0.5) {
      breakPoint = paragraphBreak;
    } else {
      // Try to break at a sentence
      const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
      let bestBreak = -1;

      for (const ender of sentenceEnders) {
        const pos = remaining.lastIndexOf(ender, maxLength);
        if (pos > bestBreak && pos > maxLength * 0.5) {
          bestBreak = pos + ender.length - 1;
        }
      }

      if (bestBreak > 0) {
        breakPoint = bestBreak;
      } else {
        // Fall back to breaking at a space
        const spaceBreak = remaining.lastIndexOf(' ', maxLength);
        if (spaceBreak > maxLength * 0.7) {
          breakPoint = spaceBreak;
        }
      }
    }

    chunks.push(remaining.slice(0, breakPoint).trim());
    remaining = remaining.slice(breakPoint).trim();
  }

  return chunks;
}

/**
 * Validate a phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  // E.164 format: +[country code][number]
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Format a phone number to E.164
 */
export function formatToE164(phone: string, defaultCountry = '1'): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // Add country code if not present
  if (!digits.startsWith('1') && digits.length === 10) {
    digits = defaultCountry + digits;
  }

  return '+' + digits;
}

/**
 * Parse an incoming Twilio webhook request
 */
export interface IncomingSmsWebhook {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

export function parseIncomingSms(body: IncomingSmsWebhook) {
  const mediaUrls: { url: string; contentType: string }[] = [];
  const numMedia = parseInt(body.NumMedia, 10);

  for (let i = 0; i < numMedia; i++) {
    const urlKey = `MediaUrl${i}` as keyof IncomingSmsWebhook;
    const typeKey = `MediaContentType${i}` as keyof IncomingSmsWebhook;

    if (body[urlKey]) {
      mediaUrls.push({
        url: body[urlKey] as string,
        contentType: (body[typeKey] as string) || 'application/octet-stream',
      });
    }
  }

  return {
    sid: body.MessageSid,
    from: body.From,
    to: body.To,
    body: body.Body,
    mediaUrls,
  };
}

/**
 * Validate an incoming Twilio webhook request
 * Returns true if the request is authentic, false otherwise
 */
export function validateTwilioWebhook(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('TWILIO_AUTH_TOKEN not configured, cannot validate webhook');
    return false;
  }

  if (!signature) {
    console.error('Missing X-Twilio-Signature header');
    return false;
  }

  return validateRequest(authToken, signature, url, params);
}
