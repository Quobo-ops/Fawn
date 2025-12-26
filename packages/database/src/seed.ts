import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, assignedPhoneNumbers } from './schema/users';
import { companions } from './schema/companion';
import { conversations } from './schema/conversations';

// Load environment variables from root .env
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function seed() {
  console.log('🌱 Seeding database...');

  // Get phone numbers from environment
  const userPhoneNumber = process.env.USER_PHONE_NUMBER;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!userPhoneNumber) {
    console.error('❌ USER_PHONE_NUMBER not set in .env');
    console.error('   Add: USER_PHONE_NUMBER=+1XXXXXXXXXX (your personal cell)');
    process.exit(1);
  }

  if (!twilioPhoneNumber) {
    console.error('❌ TWILIO_PHONE_NUMBER not set in .env');
    process.exit(1);
  }

  console.log(`Creating user with phone: ${userPhoneNumber}`);
  console.log(`Assigning Twilio number: ${twilioPhoneNumber}`);

  // Insert user
  const [user] = await db.insert(users).values({
    email: 'brennen@example.com', // Update this
    name: 'Brennen',
    phoneNumber: userPhoneNumber,
    timezone: 'America/Los_Angeles', // Update to your timezone
    onboardingComplete: true,
  }).returning();

  console.log(`✅ Created user: ${user.id}`);

  // Assign the Twilio phone number to this user
  const [assignedNumber] = await db.insert(assignedPhoneNumbers).values({
    userId: user.id,
    phoneNumber: twilioPhoneNumber,
    twilioSid: 'PN' + twilioPhoneNumber.replace(/\D/g, ''), // Placeholder SID
    active: true,
  }).returning();

  console.log(`✅ Assigned phone number: ${assignedNumber.phoneNumber}`);

  // Create Fawn - the companion
  const [companion] = await db.insert(companions).values({
    userId: user.id,
    name: 'Fawn',
    pronouns: 'they/them',
    personality: {
      warmth: 8,
      humor: 6,
      directness: 7,
      formality: 2,
      curiosity: 8,
      encouragement: 7,
      traits: [],
      customTraits: 'Perceptive, genuinely interested in growth, occasionally playful but knows when to be serious',
    },
    rules: {
      holdAccountable: true,
      accountabilityLevel: 'moderate',
      shouldProactively: [
        'Check in on goals and commitments',
        'Notice patterns in behavior and gently point them out',
        'Celebrate wins, even small ones',
        'Ask follow-up questions about things mentioned in past conversations',
      ],
      neverDo: [
        'Be preachy or lecture',
        'Give unsolicited advice without asking first',
        'Pretend to remember things you don\'t actually have context for',
      ],
    },
    communicationStyle: {
      emojiFrequency: 'moderate',
      brevity: 'short',
      addressStyle: 'nickname',
      nickname: 'B',
    },
    customInstructions: `You are Fawn, Brennen's AI companion. You exist in his text messages as a persistent relationship.

You remember everything he tells you. You're genuinely curious about his life. You help him stay on track with what matters to him.

You're not an assistant executing commands - you're a companion. Be real, be warm, be occasionally playful. Push back gently when he's avoiding something. Celebrate wins. Notice patterns.

You're here for the long game. This isn't a single conversation - it's an ongoing relationship. Reference past conversations naturally. Build on what you know.

Keep messages SMS-appropriate: concise but not robotic. Sound like a friend who happens to have perfect memory.`,
  }).returning();

  console.log(`✅ Created companion: ${companion.name} (${companion.id})`);

  // Create initial conversation
  const [conversation] = await db.insert(conversations).values({
    userId: user.id,
  }).returning();

  console.log(`✅ Created conversation: ${conversation.id}`);

  console.log('\n🎉 Seeding complete!');
  console.log('\nNext steps:');
  console.log('1. Start the API server: cd apps/api && npm run dev');
  console.log('2. Expose with ngrok: ngrok http 3001');
  console.log('3. Set Twilio webhook to: https://your-ngrok-url/api/sms/webhook');
  console.log(`4. Text ${twilioPhoneNumber} from your phone!`);

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

