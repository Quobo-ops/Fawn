import { describe, it, expect } from 'vitest';
import { quickIntentMatch, INTENTS } from './intent-detector';

describe('Intent Detector', () => {
  describe('quickIntentMatch', () => {
    describe('Greetings', () => {
      it('should detect "hi" as greeting', () => {
        const result = quickIntentMatch('hi');
        expect(result).not.toBeNull();
        expect(result?.primary).toBe(INTENTS.GREETING);
        expect(result?.confidence).toBeGreaterThan(0.8);
      });

      it('should detect "hey" as greeting', () => {
        const result = quickIntentMatch('hey');
        expect(result?.primary).toBe(INTENTS.GREETING);
      });

      it('should detect "hello" as greeting', () => {
        const result = quickIntentMatch('hello');
        expect(result?.primary).toBe(INTENTS.GREETING);
      });

      it('should detect "Good morning" as greeting', () => {
        const result = quickIntentMatch('morning');
        expect(result?.primary).toBe(INTENTS.GREETING);
      });

      it('should handle greeting with extra text', () => {
        const result = quickIntentMatch('hey there');
        expect(result?.primary).toBe(INTENTS.GREETING);
      });
    });

    describe('Remember requests', () => {
      it('should detect "remember" command', () => {
        const result = quickIntentMatch('remember that I like coffee');
        expect(result).not.toBeNull();
        expect(result?.primary).toBe(INTENTS.REMEMBER);
        expect(result?.requiresAction).toBe(true);
        expect(result?.actionType).toBe('create');
      });

      it('should extract content from remember command', () => {
        const result = quickIntentMatch('remember I have a meeting tomorrow');
        expect(result?.entities?.content).toBe('I have a meeting tomorrow');
      });

      it('should detect "don\'t forget" command', () => {
        const result = quickIntentMatch("don't forget to call mom");
        expect(result?.primary).toBe(INTENTS.REMEMBER);
      });

      it('should detect "note that" command', () => {
        const result = quickIntentMatch('note that I prefer morning meetings');
        expect(result?.primary).toBe(INTENTS.REMEMBER);
      });
    });

    describe('Schedule checks', () => {
      it('should detect "what\'s on my schedule"', () => {
        const result = quickIntentMatch("what's on my schedule");
        expect(result?.primary).toBe(INTENTS.CHECK_SCHEDULE);
        expect(result?.requiresAction).toBe(true);
        expect(result?.actionType).toBe('query');
      });

      it('should detect "what do I have"', () => {
        const result = quickIntentMatch('what do I have today');
        expect(result?.primary).toBe(INTENTS.CHECK_SCHEDULE);
      });

      it('should detect "what is on my calendar"', () => {
        const result = quickIntentMatch('what is on my calendar');
        expect(result?.primary).toBe(INTENTS.CHECK_SCHEDULE);
      });
    });

    describe('Reminder requests', () => {
      it('should detect "remind me"', () => {
        const result = quickIntentMatch('remind me to call the doctor');
        expect(result?.primary).toBe(INTENTS.SET_REMINDER);
        expect(result?.requiresAction).toBe(true);
        expect(result?.actionType).toBe('create');
      });

      it('should detect "set a reminder"', () => {
        const result = quickIntentMatch('set a reminder for tomorrow');
        expect(result?.primary).toBe(INTENTS.SET_REMINDER);
      });
    });

    describe('Unmatched messages', () => {
      it('should return null for unmatched messages', () => {
        const result = quickIntentMatch('I had a great day today');
        expect(result).toBeNull();
      });

      it('should return null for complex questions', () => {
        const result = quickIntentMatch('What do you think about climate change?');
        expect(result).toBeNull();
      });
    });
  });
});
