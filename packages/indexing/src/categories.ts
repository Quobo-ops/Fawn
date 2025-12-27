/**
 * Index Category Registry
 *
 * Defines all available index categories organized by domain.
 * Each category represents a specific aspect of user understanding
 * that the companion can reference during conversations.
 *
 * Naming Convention:
 * - Letter (A-Z): Major life domain (26 domains total)
 * - Numbers (001-999): Specific topic within domain
 *
 * Example: B003 = Relationships & Social > Friendships
 */

import type { IndexCategory, IndexDomain, IndexCode } from './types';

/**
 * Domain metadata - 26 life domains (A-Z)
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
  K: {
    name: 'Knowledge & Learning',
    description: 'Education history, learning style, intellectual interests, and skill development',
    icon: '📚',
  },
  L: {
    name: 'Lifestyle & Routines',
    description: 'Daily habits, schedules, living situation, and lifestyle choices',
    icon: '🏠',
  },
  M: {
    name: 'Money & Finances',
    description: 'Financial situation, money attitudes, spending habits, and financial goals',
    icon: '💰',
  },
  N: {
    name: 'Nature & Environment',
    description: 'Connection to nature, environmental values, living space, and outdoor preferences',
    icon: '🌿',
  },
  O: {
    name: 'Opinions & Perspectives',
    description: 'Views on various topics, political/social stances, and worldly perspectives',
    icon: '🗣️',
  },
  P: {
    name: 'Personality Quirks',
    description: 'Unique traits, idiosyncrasies, pet peeves, and distinctive characteristics',
    icon: '✨',
  },
  Q: {
    name: 'Questions & Curiosities',
    description: 'Things they wonder about, unresolved questions, and areas of inquiry',
    icon: '❓',
  },
  R: {
    name: 'Recreation & Leisure',
    description: 'How they spend free time, relaxation methods, and leisure activities',
    icon: '🎮',
  },
  S: {
    name: 'Spirituality & Meaning',
    description: 'Spiritual beliefs, sense of purpose, existential views, and meaning-making',
    icon: '🕯️',
  },
  T: {
    name: 'Technology & Digital',
    description: 'Tech habits, online presence, digital preferences, and relationship with technology',
    icon: '📱',
  },
  U: {
    name: 'Uncertainties & Fears',
    description: 'Anxieties, worries, fears, and sources of uncertainty in life',
    icon: '😰',
  },
  V: {
    name: 'Values & Ethics',
    description: 'Moral compass, ethical stances, principles, and what they stand for',
    icon: '⚖️',
  },
  W: {
    name: 'Work Style & Productivity',
    description: 'How they work best, productivity patterns, focus habits, and work preferences',
    icon: '⚙️',
  },
  X: {
    name: 'eXperiences Sought',
    description: 'Bucket list items, adventures wanted, experiences they crave',
    icon: '🎢',
  },
  Y: {
    name: 'Yearnings & Desires',
    description: 'Deep wants, unfulfilled desires, wishes, and longings',
    icon: '💫',
  },
  Z: {
    name: 'Zones of Comfort',
    description: 'Safe spaces, comfort activities, security needs, and what grounds them',
    icon: '🛋️',
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

  // ============================================
  // K: Knowledge & Learning
  // ============================================
  {
    code: 'K001',
    domain: 'K',
    domainName: 'Knowledge & Learning',
    topicNumber: '001',
    topicName: 'Education History',
    description: 'Formal education, degrees, schools attended, and academic background',
    priority: 6,
  },
  {
    code: 'K002',
    domain: 'K',
    domainName: 'Knowledge & Learning',
    topicNumber: '002',
    topicName: 'Learning Style',
    description: 'How they learn best - visual, auditory, hands-on, reading, etc.',
    priority: 7,
  },
  {
    code: 'K003',
    domain: 'K',
    domainName: 'Knowledge & Learning',
    topicNumber: '003',
    topicName: 'Current Studies',
    description: 'What they are actively learning or studying right now',
    priority: 8,
  },
  {
    code: 'K004',
    domain: 'K',
    domainName: 'Knowledge & Learning',
    topicNumber: '004',
    topicName: 'Expertise Areas',
    description: 'Topics they know deeply and could teach others',
    priority: 7,
  },
  {
    code: 'K005',
    domain: 'K',
    domainName: 'Knowledge & Learning',
    topicNumber: '005',
    topicName: 'Learning Goals',
    description: 'Skills or knowledge they want to acquire',
    priority: 7,
  },

  // ============================================
  // L: Lifestyle & Routines
  // ============================================
  {
    code: 'L001',
    domain: 'L',
    domainName: 'Lifestyle & Routines',
    topicNumber: '001',
    topicName: 'Daily Routine',
    description: 'Typical daily schedule, morning and evening routines',
    priority: 7,
  },
  {
    code: 'L002',
    domain: 'L',
    domainName: 'Lifestyle & Routines',
    topicNumber: '002',
    topicName: 'Living Situation',
    description: 'Where and how they live - home, roommates, location',
    priority: 6,
  },
  {
    code: 'L003',
    domain: 'L',
    domainName: 'Lifestyle & Routines',
    topicNumber: '003',
    topicName: 'Weekly Patterns',
    description: 'How their week is typically structured, recurring activities',
    priority: 6,
  },
  {
    code: 'L004',
    domain: 'L',
    domainName: 'Lifestyle & Routines',
    topicNumber: '004',
    topicName: 'Lifestyle Values',
    description: 'What kind of lifestyle they aspire to or prioritize',
    priority: 7,
  },
  {
    code: 'L005',
    domain: 'L',
    domainName: 'Lifestyle & Routines',
    topicNumber: '005',
    topicName: 'Time Management',
    description: 'How they manage time, scheduling preferences, punctuality',
    priority: 6,
  },

  // ============================================
  // M: Money & Finances
  // ============================================
  {
    code: 'M001',
    domain: 'M',
    domainName: 'Money & Finances',
    topicNumber: '001',
    topicName: 'Financial Situation',
    description: 'General financial status and stability',
    priority: 7,
  },
  {
    code: 'M002',
    domain: 'M',
    domainName: 'Money & Finances',
    topicNumber: '002',
    topicName: 'Money Attitudes',
    description: 'Relationship with money, beliefs about wealth, spending vs saving',
    priority: 8,
  },
  {
    code: 'M003',
    domain: 'M',
    domainName: 'Money & Finances',
    topicNumber: '003',
    topicName: 'Financial Goals',
    description: 'Savings goals, investment plans, financial aspirations',
    priority: 7,
  },
  {
    code: 'M004',
    domain: 'M',
    domainName: 'Money & Finances',
    topicNumber: '004',
    topicName: 'Spending Patterns',
    description: 'What they spend money on, budgeting habits',
    priority: 6,
  },
  {
    code: 'M005',
    domain: 'M',
    domainName: 'Money & Finances',
    topicNumber: '005',
    topicName: 'Financial Stressors',
    description: 'Money-related worries, debts, or financial challenges',
    priority: 8,
  },

  // ============================================
  // N: Nature & Environment
  // ============================================
  {
    code: 'N001',
    domain: 'N',
    domainName: 'Nature & Environment',
    topicNumber: '001',
    topicName: 'Nature Connection',
    description: 'Relationship with nature, outdoor activities, time in nature',
    priority: 6,
  },
  {
    code: 'N002',
    domain: 'N',
    domainName: 'Nature & Environment',
    topicNumber: '002',
    topicName: 'Environmental Values',
    description: 'Environmental consciousness, sustainability practices',
    priority: 6,
  },
  {
    code: 'N003',
    domain: 'N',
    domainName: 'Nature & Environment',
    topicNumber: '003',
    topicName: 'Physical Environment',
    description: 'Preferences for their living/working environment, organization',
    priority: 7,
  },
  {
    code: 'N004',
    domain: 'N',
    domainName: 'Nature & Environment',
    topicNumber: '004',
    topicName: 'Pets & Animals',
    description: 'Relationship with animals, pets they have or want',
    priority: 6,
  },
  {
    code: 'N005',
    domain: 'N',
    domainName: 'Nature & Environment',
    topicNumber: '005',
    topicName: 'Ideal Setting',
    description: 'Where they feel most at peace - city, country, beach, mountains',
    priority: 6,
  },

  // ============================================
  // O: Opinions & Perspectives
  // ============================================
  {
    code: 'O001',
    domain: 'O',
    domainName: 'Opinions & Perspectives',
    topicNumber: '001',
    topicName: 'Political Views',
    description: 'Political leanings, civic engagement, and political opinions',
    priority: 5,
  },
  {
    code: 'O002',
    domain: 'O',
    domainName: 'Opinions & Perspectives',
    topicNumber: '002',
    topicName: 'Social Issues',
    description: 'Views on social issues, causes they care about',
    priority: 6,
  },
  {
    code: 'O003',
    domain: 'O',
    domainName: 'Opinions & Perspectives',
    topicNumber: '003',
    topicName: 'Controversial Topics',
    description: 'Where they stand on debated topics',
    priority: 5,
  },
  {
    code: 'O004',
    domain: 'O',
    domainName: 'Opinions & Perspectives',
    topicNumber: '004',
    topicName: 'World Events',
    description: 'How they view and engage with current events',
    priority: 5,
  },
  {
    code: 'O005',
    domain: 'O',
    domainName: 'Opinions & Perspectives',
    topicNumber: '005',
    topicName: 'Strong Beliefs',
    description: 'Topics they feel strongly about and are vocal on',
    priority: 7,
  },

  // ============================================
  // P: Personality Quirks
  // ============================================
  {
    code: 'P001',
    domain: 'P',
    domainName: 'Personality Quirks',
    topicNumber: '001',
    topicName: 'Unique Habits',
    description: 'Distinctive habits and behaviors that define them',
    priority: 6,
  },
  {
    code: 'P002',
    domain: 'P',
    domainName: 'Personality Quirks',
    topicNumber: '002',
    topicName: 'Pet Peeves',
    description: 'Things that annoy or bother them',
    priority: 7,
  },
  {
    code: 'P003',
    domain: 'P',
    domainName: 'Personality Quirks',
    topicNumber: '003',
    topicName: 'Superstitions & Rituals',
    description: 'Personal superstitions, rituals, or quirky beliefs',
    priority: 5,
  },
  {
    code: 'P004',
    domain: 'P',
    domainName: 'Personality Quirks',
    topicNumber: '004',
    topicName: 'Guilty Pleasures',
    description: 'Things they enjoy but might be embarrassed about',
    priority: 5,
  },
  {
    code: 'P005',
    domain: 'P',
    domainName: 'Personality Quirks',
    topicNumber: '005',
    topicName: 'Idiosyncrasies',
    description: 'Unusual preferences or behaviors that make them unique',
    priority: 6,
  },

  // ============================================
  // Q: Questions & Curiosities
  // ============================================
  {
    code: 'Q001',
    domain: 'Q',
    domainName: 'Questions & Curiosities',
    topicNumber: '001',
    topicName: 'Life Questions',
    description: 'Big questions they ponder about life, meaning, existence',
    priority: 7,
  },
  {
    code: 'Q002',
    domain: 'Q',
    domainName: 'Questions & Curiosities',
    topicNumber: '002',
    topicName: 'Unresolved Mysteries',
    description: 'Personal mysteries or questions they wish they had answers to',
    priority: 6,
  },
  {
    code: 'Q003',
    domain: 'Q',
    domainName: 'Questions & Curiosities',
    topicNumber: '003',
    topicName: 'Intellectual Curiosities',
    description: 'Topics that fascinate them and spark their curiosity',
    priority: 6,
  },
  {
    code: 'Q004',
    domain: 'Q',
    domainName: 'Questions & Curiosities',
    topicNumber: '004',
    topicName: 'Self-Inquiry',
    description: 'Questions they have about themselves, self-exploration',
    priority: 7,
  },
  {
    code: 'Q005',
    domain: 'Q',
    domainName: 'Questions & Curiosities',
    topicNumber: '005',
    topicName: 'Future Unknowns',
    description: 'What they wonder about regarding their future',
    priority: 7,
  },

  // ============================================
  // R: Recreation & Leisure
  // ============================================
  {
    code: 'R001',
    domain: 'R',
    domainName: 'Recreation & Leisure',
    topicNumber: '001',
    topicName: 'Free Time Activities',
    description: 'How they spend free time when they have it',
    priority: 6,
  },
  {
    code: 'R002',
    domain: 'R',
    domainName: 'Recreation & Leisure',
    topicNumber: '002',
    topicName: 'Relaxation Methods',
    description: 'How they unwind and de-stress',
    priority: 7,
  },
  {
    code: 'R003',
    domain: 'R',
    domainName: 'Recreation & Leisure',
    topicNumber: '003',
    topicName: 'Social Recreation',
    description: 'Leisure activities they enjoy with others',
    priority: 6,
  },
  {
    code: 'R004',
    domain: 'R',
    domainName: 'Recreation & Leisure',
    topicNumber: '004',
    topicName: 'Solo Activities',
    description: 'Things they enjoy doing alone',
    priority: 6,
  },
  {
    code: 'R005',
    domain: 'R',
    domainName: 'Recreation & Leisure',
    topicNumber: '005',
    topicName: 'Weekend Patterns',
    description: 'How they typically spend weekends',
    priority: 5,
  },

  // ============================================
  // S: Spirituality & Meaning
  // ============================================
  {
    code: 'S001',
    domain: 'S',
    domainName: 'Spirituality & Meaning',
    topicNumber: '001',
    topicName: 'Spiritual Beliefs',
    description: 'Religious or spiritual beliefs and practices',
    priority: 7,
  },
  {
    code: 'S002',
    domain: 'S',
    domainName: 'Spirituality & Meaning',
    topicNumber: '002',
    topicName: 'Life Purpose',
    description: 'Sense of purpose, why they are here, what gives life meaning',
    priority: 9,
  },
  {
    code: 'S003',
    domain: 'S',
    domainName: 'Spirituality & Meaning',
    topicNumber: '003',
    topicName: 'Existential Views',
    description: 'Views on death, afterlife, the nature of reality',
    priority: 6,
  },
  {
    code: 'S004',
    domain: 'S',
    domainName: 'Spirituality & Meaning',
    topicNumber: '004',
    topicName: 'Spiritual Practices',
    description: 'Meditation, prayer, rituals, or spiritual disciplines',
    priority: 6,
  },
  {
    code: 'S005',
    domain: 'S',
    domainName: 'Spirituality & Meaning',
    topicNumber: '005',
    topicName: 'Meaning Sources',
    description: 'Where they derive meaning - family, work, service, creation',
    priority: 8,
  },

  // ============================================
  // T: Technology & Digital
  // ============================================
  {
    code: 'T001',
    domain: 'T',
    domainName: 'Technology & Digital',
    topicNumber: '001',
    topicName: 'Tech Relationship',
    description: 'Overall relationship with technology - embrace or avoid',
    priority: 6,
  },
  {
    code: 'T002',
    domain: 'T',
    domainName: 'Technology & Digital',
    topicNumber: '002',
    topicName: 'Digital Habits',
    description: 'Screen time, social media use, digital consumption patterns',
    priority: 6,
  },
  {
    code: 'T003',
    domain: 'T',
    domainName: 'Technology & Digital',
    topicNumber: '003',
    topicName: 'Online Presence',
    description: 'Social media presence, online identity, digital footprint',
    priority: 5,
  },
  {
    code: 'T004',
    domain: 'T',
    domainName: 'Technology & Digital',
    topicNumber: '004',
    topicName: 'Tech Preferences',
    description: 'Preferred devices, apps, platforms, and tools',
    priority: 5,
  },
  {
    code: 'T005',
    domain: 'T',
    domainName: 'Technology & Digital',
    topicNumber: '005',
    topicName: 'Digital Boundaries',
    description: 'Limits they set around technology use, digital detox',
    priority: 7,
  },

  // ============================================
  // U: Uncertainties & Fears
  // ============================================
  {
    code: 'U001',
    domain: 'U',
    domainName: 'Uncertainties & Fears',
    topicNumber: '001',
    topicName: 'Core Fears',
    description: 'Deep-seated fears that influence their behavior',
    priority: 9,
  },
  {
    code: 'U002',
    domain: 'U',
    domainName: 'Uncertainties & Fears',
    topicNumber: '002',
    topicName: 'Anxieties',
    description: 'Things that make them anxious or worried',
    priority: 9,
  },
  {
    code: 'U003',
    domain: 'U',
    domainName: 'Uncertainties & Fears',
    topicNumber: '003',
    topicName: 'Phobias',
    description: 'Specific phobias or irrational fears',
    priority: 6,
  },
  {
    code: 'U004',
    domain: 'U',
    domainName: 'Uncertainties & Fears',
    topicNumber: '004',
    topicName: 'Worst Case Scenarios',
    description: 'What they worry might happen, catastrophic thinking patterns',
    priority: 7,
  },
  {
    code: 'U005',
    domain: 'U',
    domainName: 'Uncertainties & Fears',
    topicNumber: '005',
    topicName: 'Insecurities',
    description: 'Areas where they feel insecure or lack confidence',
    priority: 8,
  },

  // ============================================
  // V: Values & Ethics
  // ============================================
  {
    code: 'V001',
    domain: 'V',
    domainName: 'Values & Ethics',
    topicNumber: '001',
    topicName: 'Moral Compass',
    description: 'Core moral principles that guide their decisions',
    priority: 9,
  },
  {
    code: 'V002',
    domain: 'V',
    domainName: 'Values & Ethics',
    topicNumber: '002',
    topicName: 'Ethical Dilemmas',
    description: 'How they navigate ethical gray areas',
    priority: 7,
  },
  {
    code: 'V003',
    domain: 'V',
    domainName: 'Values & Ethics',
    topicNumber: '003',
    topicName: 'Integrity',
    description: 'How they maintain integrity and handle moral conflicts',
    priority: 8,
  },
  {
    code: 'V004',
    domain: 'V',
    domainName: 'Values & Ethics',
    topicNumber: '004',
    topicName: 'Non-Negotiables',
    description: 'Values they will never compromise on',
    priority: 9,
  },
  {
    code: 'V005',
    domain: 'V',
    domainName: 'Values & Ethics',
    topicNumber: '005',
    topicName: 'Ethical Role Models',
    description: 'People they admire for their ethics and values',
    priority: 6,
  },

  // ============================================
  // W: Work Style & Productivity
  // ============================================
  {
    code: 'W001',
    domain: 'W',
    domainName: 'Work Style & Productivity',
    topicNumber: '001',
    topicName: 'Productivity Style',
    description: 'How they work most effectively, productivity systems',
    priority: 7,
  },
  {
    code: 'W002',
    domain: 'W',
    domainName: 'Work Style & Productivity',
    topicNumber: '002',
    topicName: 'Focus Patterns',
    description: 'When and how they focus best, attention patterns',
    priority: 7,
  },
  {
    code: 'W003',
    domain: 'W',
    domainName: 'Work Style & Productivity',
    topicNumber: '003',
    topicName: 'Procrastination',
    description: 'Procrastination tendencies and what causes them',
    priority: 7,
  },
  {
    code: 'W004',
    domain: 'W',
    domainName: 'Work Style & Productivity',
    topicNumber: '004',
    topicName: 'Work Environment',
    description: 'Ideal work conditions - quiet, music, coffee shop, etc.',
    priority: 6,
  },
  {
    code: 'W005',
    domain: 'W',
    domainName: 'Work Style & Productivity',
    topicNumber: '005',
    topicName: 'Energy Management',
    description: 'How they manage energy throughout the day',
    priority: 7,
  },

  // ============================================
  // X: eXperiences Sought
  // ============================================
  {
    code: 'X001',
    domain: 'X',
    domainName: 'eXperiences Sought',
    topicNumber: '001',
    topicName: 'Bucket List',
    description: 'Experiences they want to have before they die',
    priority: 7,
  },
  {
    code: 'X002',
    domain: 'X',
    domainName: 'eXperiences Sought',
    topicNumber: '002',
    topicName: 'Adventures Wanted',
    description: 'Adventurous experiences they crave',
    priority: 6,
  },
  {
    code: 'X003',
    domain: 'X',
    domainName: 'eXperiences Sought',
    topicNumber: '003',
    topicName: 'Skills to Try',
    description: 'Skills or activities they want to experience',
    priority: 6,
  },
  {
    code: 'X004',
    domain: 'X',
    domainName: 'eXperiences Sought',
    topicNumber: '004',
    topicName: 'Places to Visit',
    description: 'Destinations they dream of visiting',
    priority: 6,
  },
  {
    code: 'X005',
    domain: 'X',
    domainName: 'eXperiences Sought',
    topicNumber: '005',
    topicName: 'Life Experiments',
    description: 'Things they want to try or experiment with in life',
    priority: 6,
  },

  // ============================================
  // Y: Yearnings & Desires
  // ============================================
  {
    code: 'Y001',
    domain: 'Y',
    domainName: 'Yearnings & Desires',
    topicNumber: '001',
    topicName: 'Deep Desires',
    description: 'Fundamental desires that drive their life',
    priority: 9,
  },
  {
    code: 'Y002',
    domain: 'Y',
    domainName: 'Yearnings & Desires',
    topicNumber: '002',
    topicName: 'Unfulfilled Wishes',
    description: 'Things they wish for but haven\'t achieved',
    priority: 8,
  },
  {
    code: 'Y003',
    domain: 'Y',
    domainName: 'Yearnings & Desires',
    topicNumber: '003',
    topicName: 'Secret Wants',
    description: 'Desires they may not openly share',
    priority: 7,
  },
  {
    code: 'Y004',
    domain: 'Y',
    domainName: 'Yearnings & Desires',
    topicNumber: '004',
    topicName: 'Romantic Yearnings',
    description: 'Desires related to love and romantic connection',
    priority: 8,
  },
  {
    code: 'Y005',
    domain: 'Y',
    domainName: 'Yearnings & Desires',
    topicNumber: '005',
    topicName: 'Lifestyle Desires',
    description: 'The life they wish they were living',
    priority: 7,
  },

  // ============================================
  // Z: Zones of Comfort
  // ============================================
  {
    code: 'Z001',
    domain: 'Z',
    domainName: 'Zones of Comfort',
    topicNumber: '001',
    topicName: 'Safe Spaces',
    description: 'Physical and emotional spaces where they feel safest',
    priority: 8,
  },
  {
    code: 'Z002',
    domain: 'Z',
    domainName: 'Zones of Comfort',
    topicNumber: '002',
    topicName: 'Comfort Activities',
    description: 'Activities that bring comfort when stressed or upset',
    priority: 8,
  },
  {
    code: 'Z003',
    domain: 'Z',
    domainName: 'Zones of Comfort',
    topicNumber: '003',
    topicName: 'Comfort People',
    description: 'People they turn to for comfort and security',
    priority: 8,
  },
  {
    code: 'Z004',
    domain: 'Z',
    domainName: 'Zones of Comfort',
    topicNumber: '004',
    topicName: 'Security Needs',
    description: 'What they need to feel secure and stable',
    priority: 8,
  },
  {
    code: 'Z005',
    domain: 'Z',
    domainName: 'Zones of Comfort',
    topicNumber: '005',
    topicName: 'Grounding Practices',
    description: 'What grounds them when feeling overwhelmed',
    priority: 8,
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
