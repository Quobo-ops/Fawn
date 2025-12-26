'use client';

import { useEffect, useState } from 'react';
import { api, Companion } from '@/lib/api';
import { Save, RotateCcw, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function CompanionSettingsPage() {
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadCompanion() {
      try {
        const data = await api.getCompanion();
        setCompanion(data);
      } catch (error) {
        console.error('Failed to load companion:', error);
      } finally {
        setLoading(false);
      }
    }
    loadCompanion();
  }, []);

  const handleSave = async () => {
    if (!companion) return;
    setSaving(true);
    try {
      await api.updateCompanion(companion);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset companion to default settings?')) return;
    try {
      await api.resetCompanion();
      const data = await api.getCompanion();
      setCompanion(data);
    } catch (error) {
      console.error('Failed to reset:', error);
    }
  };

  if (loading || !companion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Companion Settings</h1>
          <p className="text-gray-600">Customize your AI companion's personality and behavior</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium',
              saved
                ? 'bg-green-500 text-white'
                : 'bg-fawn-600 text-white hover:bg-fawn-700'
            )}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Identity */}
        <Section title="Identity" description="What should your companion be called?">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={companion.name}
                onChange={(e) =>
                  setCompanion({ ...companion, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fawn-500 focus:border-fawn-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pronouns
              </label>
              <select
                value={companion.pronouns}
                onChange={(e) =>
                  setCompanion({ ...companion, pronouns: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fawn-500 focus:border-fawn-500"
              >
                <option value="they/them">they/them</option>
                <option value="she/her">she/her</option>
                <option value="he/him">he/him</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Personality Sliders */}
        <Section
          title="Personality"
          description="Adjust the personality traits of your companion"
        >
          <div className="space-y-6">
            <PersonalitySlider
              label="Warmth"
              leftLabel="Professional"
              rightLabel="Warm & caring"
              value={companion.personality.warmth}
              onChange={(v) =>
                setCompanion({
                  ...companion,
                  personality: { ...companion.personality, warmth: v },
                })
              }
            />
            <PersonalitySlider
              label="Humor"
              leftLabel="Serious"
              rightLabel="Playful"
              value={companion.personality.humor}
              onChange={(v) =>
                setCompanion({
                  ...companion,
                  personality: { ...companion.personality, humor: v },
                })
              }
            />
            <PersonalitySlider
              label="Directness"
              leftLabel="Gentle"
              rightLabel="Direct"
              value={companion.personality.directness}
              onChange={(v) =>
                setCompanion({
                  ...companion,
                  personality: { ...companion.personality, directness: v },
                })
              }
            />
            <PersonalitySlider
              label="Formality"
              leftLabel="Casual"
              rightLabel="Formal"
              value={companion.personality.formality}
              onChange={(v) =>
                setCompanion({
                  ...companion,
                  personality: { ...companion.personality, formality: v },
                })
              }
            />
            <PersonalitySlider
              label="Curiosity"
              leftLabel="Accepting"
              rightLabel="Inquisitive"
              value={companion.personality.curiosity}
              onChange={(v) =>
                setCompanion({
                  ...companion,
                  personality: { ...companion.personality, curiosity: v },
                })
              }
            />
            <PersonalitySlider
              label="Encouragement"
              leftLabel="Neutral"
              rightLabel="Motivating"
              value={companion.personality.encouragement}
              onChange={(v) =>
                setCompanion({
                  ...companion,
                  personality: { ...companion.personality, encouragement: v },
                })
              }
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom personality notes
            </label>
            <textarea
              value={companion.personality.customTraits || ''}
              onChange={(e) =>
                setCompanion({
                  ...companion,
                  personality: { ...companion.personality, customTraits: e.target.value },
                })
              }
              placeholder="Any additional personality traits or behaviors you'd like..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fawn-500 focus:border-fawn-500"
            />
          </div>
        </Section>

        {/* Communication Style */}
        <Section
          title="Communication Style"
          description="How should your companion communicate?"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emoji Usage
              </label>
              <select
                value={companion.communicationStyle.emojiFrequency}
                onChange={(e) =>
                  setCompanion({
                    ...companion,
                    communicationStyle: {
                      ...companion.communicationStyle,
                      emojiFrequency: e.target.value as Companion['communicationStyle']['emojiFrequency'],
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="never">Never</option>
                <option value="rare">Rarely</option>
                <option value="moderate">Sometimes</option>
                <option value="frequent">Frequently</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Length
              </label>
              <select
                value={companion.communicationStyle.brevity}
                onChange={(e) =>
                  setCompanion({
                    ...companion,
                    communicationStyle: {
                      ...companion.communicationStyle,
                      brevity: e.target.value as Companion['communicationStyle']['brevity'],
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="very_short">Very short (1-2 sentences)</option>
                <option value="short">Short (2-3 sentences)</option>
                <option value="medium">Medium</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How to address you
              </label>
              <select
                value={companion.communicationStyle.addressStyle}
                onChange={(e) =>
                  setCompanion({
                    ...companion,
                    communicationStyle: {
                      ...companion.communicationStyle,
                      addressStyle: e.target.value as Companion['communicationStyle']['addressStyle'],
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="name">By my name</option>
                <option value="nickname">By a nickname</option>
                <option value="none">Don't use names</option>
              </select>
            </div>

            {companion.communicationStyle.addressStyle === 'nickname' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your nickname
                </label>
                <input
                  type="text"
                  value={companion.communicationStyle.nickname || ''}
                  onChange={(e) =>
                    setCompanion({
                      ...companion,
                      communicationStyle: {
                        ...companion.communicationStyle,
                        nickname: e.target.value,
                      },
                    })
                  }
                  placeholder="What should I call you?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}
          </div>
        </Section>

        {/* Rules & Restrictions */}
        <Section
          title="Rules & Restrictions"
          description="Set boundaries for your companion"
        >
          <div className="space-y-6">
            <TagInput
              label="Topics to avoid"
              description="Your companion will not discuss these topics"
              values={companion.rules.avoidTopics || []}
              onChange={(values) =>
                setCompanion({
                  ...companion,
                  rules: { ...companion.rules, avoidTopics: values },
                })
              }
            />

            <TagInput
              label="Sensitive topics"
              description="Handle these topics with extra care"
              values={companion.rules.sensitiveTopics || []}
              onChange={(values) =>
                setCompanion({
                  ...companion,
                  rules: { ...companion.rules, sensitiveTopics: values },
                })
              }
            />

            <TagInput
              label="Never do"
              description="Things your companion should never do"
              values={companion.rules.neverDo || []}
              onChange={(values) =>
                setCompanion({
                  ...companion,
                  rules: { ...companion.rules, neverDo: values },
                })
              }
            />

            <TagInput
              label="Proactive behaviors"
              description="Things your companion should proactively do"
              values={companion.rules.shouldProactively || []}
              onChange={(values) =>
                setCompanion({
                  ...companion,
                  rules: { ...companion.rules, shouldProactively: values },
                })
              }
              placeholder="e.g., Check in on my goals weekly"
            />

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Accountability</p>
                <p className="text-sm text-gray-600">
                  Hold me accountable to my goals and commitments
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={companion.rules.holdAccountable || false}
                    onChange={(e) =>
                      setCompanion({
                        ...companion,
                        rules: {
                          ...companion.rules,
                          holdAccountable: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-fawn-600 focus:ring-fawn-500"
                  />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
                {companion.rules.holdAccountable && (
                  <select
                    value={companion.rules.accountabilityLevel || 'moderate'}
                    onChange={(e) =>
                      setCompanion({
                        ...companion,
                        rules: {
                          ...companion.rules,
                          accountabilityLevel: e.target.value as 'gentle' | 'moderate' | 'firm',
                        },
                      })
                    }
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="gentle">Gentle</option>
                    <option value="moderate">Moderate</option>
                    <option value="firm">Firm</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Custom Instructions */}
        <Section
          title="Custom Instructions"
          description="Anything else you want your companion to know"
        >
          <textarea
            value={companion.customInstructions || ''}
            onChange={(e) =>
              setCompanion({ ...companion, customInstructions: e.target.value })
            }
            placeholder="Any additional instructions, context, or rules..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fawn-500 focus:border-fawn-500"
          />
          <p className="mt-2 text-sm text-gray-500">
            This is free-form text that will be included in your companion's instructions.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">{title}</h2>
      <p className="text-sm text-gray-600 mb-6">{description}</p>
      {children}
    </div>
  );
}

function PersonalitySlider({
  label,
  leftLabel,
  rightLabel,
  value,
  onChange,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm text-gray-500">{value}/10</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-20 text-right">{leftLabel}</span>
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-fawn-500"
        />
        <span className="text-xs text-gray-500 w-20">{rightLabel}</span>
      </div>
    </div>
  );
}

function TagInput({
  label,
  description,
  values,
  onChange,
  placeholder = 'Type and press Enter',
}: {
  label: string;
  description: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(values.filter((v) => v !== tag));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <p className="text-sm text-gray-500 mb-2">{description}</p>

      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 bg-fawn-50 text-fawn-700 rounded-full text-sm"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:text-fawn-900"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fawn-500 focus:border-fawn-500"
        />
        <button
          onClick={addTag}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <Plus className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
