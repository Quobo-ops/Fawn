import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db, users, assignedPhoneNumbers, companions } from '@fawn/database';
import { searchAvailableNumbers, provisionPhoneNumber, sendSms } from '@fawn/sms';
import { eq } from 'drizzle-orm';

export const usersRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/),
  timezone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function getUserIdFromAuth(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.warn('[WARN] Invalid JWT token:', error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.warn('[WARN] Expired JWT token');
    } else if (error instanceof jwt.NotBeforeError) {
      console.warn('[WARN] JWT token not active yet');
    } else {
      console.error('[ERROR] JWT verification error:', error);
    }
    return null;
  }
}

/**
 * Create a new user account
 */
usersRouter.post('/register', async (req, res) => {
  try {
    const data = createUserSchema.parse(req.body);

    // Check if email already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (existing) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Hash password (stored separately in production)
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user with password hash
    const [user] = await db.insert(users).values({
      email: data.email,
      passwordHash,
      name: data.name,
      phoneNumber: data.phoneNumber,
      timezone: data.timezone || 'UTC',
    }).returning();

    console.log(`[INFO] Created user: ${user.id} (${user.email})`);

    // Create default companion
    try {
      await db.insert(companions).values({
        userId: user.id,
        name: 'Fawn',
        pronouns: 'they/them',
        personality: {
          warmth: 7,
          humor: 5,
          directness: 6,
          formality: 3,
          curiosity: 7,
          encouragement: 7,
          traits: [],
        },
        communicationStyle: {
          emojiFrequency: 'moderate',
          brevity: 'short',
          addressStyle: 'name',
        },
        rules: {
          holdAccountable: true,
          accountabilityLevel: 'moderate',
        },
      });
    } catch (companionError) {
      console.error(`[ERROR] Failed to create companion for user ${user.id}:`, companionError);
      // Continue - user can still use the system
    }

    // Provision a Twilio phone number
    const webhookUrl = `${process.env.API_BASE_URL}/api/sms/webhook`;
    let companionNumber: string | null = null;
    let provisioningError: string | null = null;
    let provisionedNumber: { phoneNumber: string; sid: string } | null = null;

    try {
      const availableNumbers = await searchAvailableNumbers({
        country: 'US',
        smsCapable: true,
      });

      if (availableNumbers.length === 0) {
        provisioningError = 'No phone numbers available';
        console.error(`[ERROR] No phone numbers available for user ${user.id}`);
      } else {
        try {
          provisionedNumber = await provisionPhoneNumber(
            availableNumbers[0].phoneNumber,
            webhookUrl,
            `Fawn - ${user.email}`
          );

          await db.insert(assignedPhoneNumbers).values({
            userId: user.id,
            phoneNumber: provisionedNumber.phoneNumber,
            twilioSid: provisionedNumber.sid,
          });

          companionNumber = provisionedNumber.phoneNumber;
          console.log(`[INFO] Provisioned phone number ${provisionedNumber.phoneNumber} for user ${user.id}`);
        } catch (provisionError) {
          provisioningError = 'Phone provisioning failed';
          console.error(`[ERROR] Failed to provision phone number for user ${user.id}:`, provisionError);
          // Continue without phone number - user can still use web interface
        }
      }
    } catch (numberSearchError) {
      provisioningError = 'Phone number search failed';
      console.error(`[ERROR] Failed to search for available numbers for user ${user.id}:`, numberSearchError);
      // Continue without phone number
    }

    // Send welcome message (only if we have a number)
    if (provisionedNumber) {
      try {
        await sendSms({
          from: provisionedNumber.phoneNumber,
          to: data.phoneNumber,
          body: `Hey! I'm Fawn, your new AI companion. Save this number - this is where we'll chat. You can tell me about your day, set goals, schedule things, or just talk. I'm here whenever you need me. What's on your mind?`,
        });
        console.log(`[INFO] Sent welcome SMS to ${data.phoneNumber}`);
      } catch (smsError) {
        console.error(`[ERROR] Failed to send welcome SMS to ${data.phoneNumber}:`, smsError, {
          userId: user.id,
          fromNumber: provisionedNumber.phoneNumber,
        });
        // Non-critical - user account is still created
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companionNumber,
      },
      token,
      provisioningError,
      phoneNumberAssigned: !!provisionedNumber,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('[ERROR] Registration error:', error, {
      email: req.body?.email,
    });
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * User login
 */
usersRouter.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password hash
    if (!user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`[INFO] User logged in: ${user.id}`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('[ERROR] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Get current user profile
 */
usersRouter.get('/me', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const assignedNumber = await db.query.assignedPhoneNumbers.findFirst({
      where: eq(assignedPhoneNumbers.userId, user.id),
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      timezone: user.timezone,
      companionNumber: assignedNumber?.phoneNumber,
      onboardingComplete: user.onboardingComplete,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error(`[ERROR] Failed to get user profile for ${userId}:`, error);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

/**
 * Update user profile
 */
usersRouter.patch('/me', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const updateSchema = z.object({
      name: z.string().optional(),
      timezone: z.string().optional(),
      preferences: z.record(z.unknown()).optional(),
      onboardingComplete: z.boolean().optional(),
    });

    const data = updateSchema.parse(req.body);

    await db.update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    res.json({ success: true });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error(`[ERROR] Failed to update user profile for ${userId}:`, error);
    res.status(500).json({ error: 'Update failed' });
  }
});
