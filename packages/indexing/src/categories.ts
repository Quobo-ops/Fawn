/**
 * Index Category Registry
 *
 * Defines all available index categories organized by domain.
 * Each category represents a specific aspect of user understanding
 * that the companion can reference during conversations.
 *
 * Naming Convention:
 * - Letter (A-J): Major life domain
 * - Numbers (001-999): Specific topic within domain
 *
 * Example: B003 = Relationships & Social > Friendships
 */

import type { IndexCategory, IndexDomain, IndexCode } from './types';

/**
 * Domain metadata
 */
export const DOMAINS: Record<IndexDomain, { name: string; description: string; icon: string }> = {
  A: {
    name: 'Identity & Core Self',
    description: 'Who the person is at their core - values, beliefs, personality traits, self-perception',
    icon: '🪞',
  },
  B: {
    name: 'Relationships & Social',
    description: 'Family, friends, romantic partners, social dynamics, and interpersonal patterns',
    icon: '👥',
  },
  C: {
    name: 'Career & Professional',
    description: 'Work life, career goals, professional skills, workplace dynamics, and aspirations',
    icon: '💼',
  },
  D: {
    name: 'Health & Wellness',
    description: 'Physical health, mental health, fitness, nutrition, sleep, and self-care practices',
    icon: '🏃',
  },
  E: {
    name: 'Goals & Aspirations',
    description: 'Dreams, ambitions, life goals, bucket list items, and future vision',
    icon: '🎯',
  },
  F: {
    name: 'Emotional Patterns',
    description: 'Emotional tendencies, triggers, coping mechanisms, and emotional history',
    icon: '💭',
  },
  G: {
    name: 'Life Events & History',
    description: 'Significant past events, formative experiences, milestones, and personal history',
    icon: '📖',
  },
  H: {
    name: 'Preferences & Interests',
    description: 'Hobbies, likes/dislikes, entertainment preferences, tastes, and passions',
    icon: '⭐',
  },
  I: {
    name: 'Communication & Expression',
    description: 'How they prefer to communicate, express themselves, and be spoken to',
    icon: '💬',
  },
  J: {
    name: 'Challenges & Growth',
    description: 'Current struggles, areas for improvement, lessons learned, and growth edges',
    icon: '🌱',
  },
};

/**
 * Complete category registry
 * Add new categories here as needed
 */
export const CATEGORIES: IndexCategory[] = [
  // ============================================
  // A: Identity & Core Self
  // ============================================
  {
    code: 'A001',
    domain: 'A',
    domainName: 'Identity & Core Self',
    topicNumber: '001',
    topicName: 'Core Values',
    description: 'Fundamental values and principles that guide their decisions and life',
    priority: 10,
  },
  {
    code: 'A002',
    domain: 'A',
    domainName: 'Identity & Core Self',
    topicNumber: '002',
    topicName: 'Personality Traits',
    description: 'Key personality characteristics, temperament, and behavioral tendencies',
    priority: 9,
  },
  {
    code: 'A003',
    domain: 'A',
    domainName: 'Identity & Core Self',
    topicNumber: '003',
    topicName: 'Self-Perception',
    description: 'How they see themselves, self-image, and self-understanding',
    priority: 8,
  },
  {
    code: 'A004',
    domain: 'A',
    domainName: 'Identity & Core Self',
    topicNumber: '004',
    topicName: 'Beliefs & Worldview',
    description: 'Philosophical beliefs, spiritual views, and how they see the world',
    priority: 7,
  },
  {
    code: 'A005',
    domain: 'A',
    domainName: 'Identity & Core Self',
    topicNumber: '005',
    topicName: 'Life Philosophy',
    description: 'Their approach to life, personal mantras, and guiding philosophies',
    priority: 7,
  },

  // ============================================
  // B: Relationships & Social
  // ============================================
  {
    code: 'B001',
    domain: 'B',
    domainName: 'Relationships & Social',
    topicNumber: '001',
    topicName: 'Family Dynamics',
    description: 'Family relationships, dynamics, history, and current state',
    priority: 9,
  },
  {
    code: 'B002',
    domain: 'B',
    domainName: 'Relationships & Social',
    topicNumber: '002',
    topicName: 'Romantic Relationships',
    description: 'Current/past romantic relationships, patterns, and desires',
    priority: 9,
  },
  {
    code: 'B003',
    domain: 'B',
    domainName: 'Relationships & Social',
    topicNumber: '003',
    topicName: 'Friendships',
    description: 'Close friendships, friend groups, and social connections',
    priority: 8,
  },
  {
    code: 'B004',
    domain: 'B',
    domainName: 'Relationships & Social',
    topicNumber: '004',
    topicName: 'Social Patterns',
    description: 'How they navigate social situations, introversion/extroversion',
    priority: 7,
  },
  {
    code: 'B005',
    domain: 'B',
    domainName: 'Relationships & Social',
    topicNumber: '005',
    topicName: 'Attachment Style',
    description: 'How they attach and relate in close relationships',
    priority: 8,
  },

  // ============================================
  // C: Career & Professional
  // ============================================
  {
    code: 'C001',
    domain: 'C',
    domainName: 'Career & Professional',
    topicNumber: '001',
    topicName: 'Current Work',
    description: 'Current job, role, responsibilities, and work environment',
    priority: 8,
  },
  {
    code: 'C002',
    domain: 'C',
    domainName: 'Career & Professional',
    topicNumber: '002',
    topicName: 'Career Aspirations',
    description: 'Career goals, dream job, and professional ambitions',
    priority: 8,
  },
  {
    code: 'C003',
    domain: 'C',
    domainName: 'Career & Professional',
    topicNumber: '003',
    topicName: 'Skills & Expertise',
    description: 'Professional skills, competencies, and areas of expertise',
    priority: 7,
  },
  {
    code: 'C004',
    domain: 'C',
    domainName: 'Career & Professional',
    topicNumber: '004',
    topicName: 'Work Relationships',
    description: 'Colleagues, managers, workplace dynamics and relationships',
    priority: 6,
  },
  {
    code: 'C005',
    domain: 'C',
    domainName: 'Career & Professional',
    topicNumber: '005',
    topicName: 'Work-Life Balance',
    description: 'How they balance work with personal life, boundaries, stress',
    priority: 7,
  },

  // ============================================
  // D: Health & Wellness
  // ============================================
  {
    code: 'D001',
    domain: 'D',
    domainName: 'Health & Wellness',
    topicNumber: '001',
    topicName: 'Physical Health',
    description: 'Overall physical health, conditions, and health history',
    priority: 8,
  },
  {
    code: 'D002',
    domain: 'D',
    domainName: 'Health & Wellness',
    topicNumber: '002',
    topicName: 'Mental Health',
    description: 'Mental health status, history, therapy, and coping strategies',
    priority: 9,
  },
  {
    code: 'D003',
    domain: 'D',
    domainName: 'Health & Wellness',
    topicNumber: '003',
    topicName: 'Fitness & Exercise',
    description: 'Exercise habits, fitness goals, and physical activity preferences',
    priority: 6,
  },
  {
    code: 'D004',
    domain: 'D',
    domainName: 'Health & Wellness',
    topicNumber: '004',
    topicName: 'Nutrition & Diet',
    description: 'Eating habits, dietary preferences, restrictions, and goals',
    priority: 6,
  },
  {
    code: 'D005',
    domain: 'D',
    domainName: 'Health & Wellness',
    topicNumber: '005',
    topicName: 'Sleep & Rest',
    description: 'Sleep patterns, quality, issues, and rest practices',
    priority: 7,
  },

  // ============================================
  // E: Goals & Aspirations
  // ============================================
  {
    code: 'E001',
    domain: 'E',
    domainName: 'Goals & Aspirations',
    topicNumber: '001',
    topicName: 'Life Goals',
    description: 'Major life goals, bucket list, and long-term vision',
    priority: 9,
  },
  {
    code: 'E002',
    domain: 'E',
    domainName: 'Goals & Aspirations',
    topicNumber: '002',
    topicName: 'Current Goals',
    description: 'Active goals they are working on right now',
    priority: 10,
  },
  {
    code: 'E003',
    domain: 'E',
    domainName: 'Goals & Aspirations',
    topicNumber: '003',
    topicName: 'Dreams & Wishes',
    description: 'Dreams, wishes, and aspirations even if not actively pursued',
    priority: 7,
  },
  {
    code: 'E004',
    domain: 'E',
    domainName: 'Goals & Aspirations',
    topicNumber: '004',
    topicName: 'Motivations',
    description: 'What drives and motivates them to pursue their goals',
    priority: 8,
  },
  {
    code: 'E005',
    domain: 'E',
    domainName: 'Goals & Aspirations',
    topicNumber: '005',
    topicName: 'Obstacles & Blockers',
    description: 'What tends to get in the way of their goals',
    priority: 7,
  },

  // ============================================
  // F: Emotional Patterns
  // ============================================
  {
    code: 'F001',
    domain: 'F',
    domainName: 'Emotional Patterns',
    topicNumber: '001',
    topicName: 'Emotional Tendencies',
    description: 'General emotional patterns, typical moods, and emotional range',
    priority: 9,
  },
  {
    code: 'F002',
    domain: 'F',
    domainName: 'Emotional Patterns',
    topicNumber: '002',
    topicName: 'Triggers & Sensitivities',
    description: 'What triggers emotional reactions, sensitivities to be aware of',
    priority: 10,
  },
  {
    code: 'F003',
    domain: 'F',
    domainName: 'Emotional Patterns',
    topicNumber: '003',
    topicName: 'Coping Mechanisms',
    description: 'How they cope with stress, anxiety, and difficult emotions',
    priority: 8,
  },
  {
    code: 'F004',
    domain: 'F',
    domainName: 'Emotional Patterns',
    topicNumber: '004',
    topicName: 'Joy & Fulfillment',
    description: 'What brings them joy, happiness, and fulfillment',
    priority: 8,
  },
  {
    code: 'F005',
    domain: 'F',
    domainName: 'Emotional Patterns',
    topicNumber: '005',
    topicName: 'Stress Response',
    description: 'How they respond to stress, pressure, and overwhelm',
    priority: 8,
  },

  // ============================================
  // G: Life Events & History
  // ============================================
  {
    code: 'G001',
    domain: 'G',
    domainName: 'Life Events & History',
    topicNumber: '001',
    topicName: 'Formative Experiences',
    description: 'Key experiences that shaped who they are today',
    priority: 8,
  },
  {
    code: 'G002',
    domain: 'G',
    domainName: 'Life Events & History',
    topicNumber: '002',
    topicName: 'Major Milestones',
    description: 'Significant life milestones and achievements',
    priority: 7,
  },
  {
    code: 'G003',
    domain: 'G',
    domainName: 'Life Events & History',
    topicNumber: '003',
    topicName: 'Challenges Overcome',
    description: 'Difficult times they have navigated and grown from',
    priority: 8,
  },
  {
    code: 'G004',
    domain: 'G',
    domainName: 'Life Events & History',
    topicNumber: '004',
    topicName: 'Background & Origins',
    description: 'Where they come from, upbringing, and background',
    priority: 6,
  },
  {
    code: 'G005',
    domain: 'G',
    domainName: 'Life Events & History',
    topicNumber: '005',
    topicName: 'Recent Events',
    description: 'Notable recent happenings and current life situation',
    priority: 9,
  },

  // ============================================
  // H: Preferences & Interests
  // ============================================
  {
    code: 'H001',
    domain: 'H',
    domainName: 'Preferences & Interests',
    topicNumber: '001',
    topicName: 'Hobbies & Passions',
    description: 'Activities they enjoy, hobbies, and passionate interests',
    priority: 7,
  },
  {
    code: 'H002',
    domain: 'H',
    domainName: 'Preferences & Interests',
    topicNumber: '002',
    topicName: 'Entertainment',
    description: 'Movies, music, books, games, and entertainment preferences',
    priority: 5,
  },
  {
    code: 'H003',
    domain: 'H',
    domainName: 'Preferences & Interests',
    topicNumber: '003',
    topicName: 'Food & Drink',
    description: 'Favorite foods, cuisines, drinks, and culinary preferences',
    priority: 5,
  },
  {
    code: 'H004',
    domain: 'H',
    domainName: 'Preferences & Interests',
    topicNumber: '004',
    topicName: 'Travel & Places',
    description: 'Travel preferences, favorite places, and wanderlust',
    priority: 6,
  },
  {
    code: 'H005',
    domain: 'H',
    domainName: 'Preferences & Interests',
    topicNumber: '005',
    topicName: 'Learning Interests',
    description: 'Topics they are curious about and want to learn more about',
    priority: 6,
  },

  // ============================================
  // I: Communication & Expression
  // ============================================
  {
    code: 'I001',
    domain: 'I',
    domainName: 'Communication & Expression',
    topicNumber: '001',
    topicName: 'Communication Style',
    description: 'How they prefer to communicate, tone, and style preferences',
    priority: 10,
  },
  {
    code: 'I002',
    domain: 'I',
    domainName: 'Communication & Expression',
    topicNumber: '002',
    topicName: 'Support Preferences',
    description: 'How they like to receive support, advice, and encouragement',
    priority: 9,
  },
  {
    code: 'I003',
    domain: 'I',
    domainName: 'Communication & Expression',
    topicNumber: '003',
    topicName: 'Boundaries',
    description: 'Topics they prefer to avoid or handle carefully',
    priority: 10,
  },
  {
    code: 'I004',
    domain: 'I',
    domainName: 'Communication & Expression',
    topicNumber: '004',
    topicName: 'Humor Style',
    description: 'Their sense of humor and what makes them laugh',
    priority: 6,
  },
  {
    code: 'I005',
    domain: 'I',
    domainName: 'Communication & Expression',
    topicNumber: '005',
    topicName: 'Language & Terms',
    description: 'Preferred terminology, words they use, and language style',
    priority: 7,
  },

  // ============================================
  // J: Challenges & Growth
  // ============================================
  {
    code: 'J001',
    domain: 'J',
    domainName: 'Challenges & Growth',
    topicNumber: '001',
    topicName: 'Current Challenges',
    description: 'Active struggles and challenges they are facing now',
    priority: 10,
  },
  {
    code: 'J002',
    domain: 'J',
    domainName: 'Challenges & Growth',
    topicNumber: '002',
    topicName: 'Growth Areas',
    description: 'Areas where they want to grow and improve',
    priority: 8,
  },
  {
    code: 'J003',
    domain: 'J',
    domainName: 'Challenges & Growth',
    topicNumber: '003',
    topicName: 'Patterns to Change',
    description: 'Behaviors or patterns they want to break or modify',
    priority: 8,
  },
  {
    code: 'J004',
    domain: 'J',
    domainName: 'Challenges & Growth',
    topicNumber: '004',
    topicName: 'Lessons Learned',
    description: 'Key lessons and insights from their experiences',
    priority: 7,
  },
  {
    code: 'J005',
    domain: 'J',
    domainName: 'Challenges & Growth',
    topicNumber: '005',
    topicName: 'Support Needs',
    description: 'Types of support they currently need most',
    priority: 9,
  },
];

/**
 * Get category by code
 */
export function getCategoryByCode(code: IndexCode): IndexCategory | undefined {
  return CATEGORIES.find((cat) => cat.code === code);
}

/**
 * Get all categories for a domain
 */
export function getCategoriesByDomain(domain: IndexDomain): IndexCategory[] {
  return CATEGORIES.filter((cat) => cat.domain === domain);
}

/**
 * Get categories sorted by priority (highest first)
 */
export function getCategoriesByPriority(minPriority: number = 1): IndexCategory[] {
  return CATEGORIES.filter((cat) => cat.priority >= minPriority).sort(
    (a, b) => b.priority - a.priority
  );
}

/**
 * Parse an index code into its components
 */
export function parseIndexCode(code: IndexCode): {
  domain: IndexDomain;
  topicNumber: string;
} {
  const domain = code.charAt(0) as IndexDomain;
  const topicNumber = code.slice(1);
  return { domain, topicNumber };
}

/**
 * Generate a new index code for a domain
 */
export function generateIndexCode(domain: IndexDomain, existingCodes: IndexCode[]): IndexCode {
  const domainCodes = existingCodes.filter((c) => c.startsWith(domain));
  const numbers = domainCodes.map((c) => parseInt(c.slice(1), 10));
  const maxNumber = Math.max(0, ...numbers);
  const newNumber = (maxNumber + 1).toString().padStart(3, '0');
  return `${domain}${newNumber}` as IndexCode;
}
