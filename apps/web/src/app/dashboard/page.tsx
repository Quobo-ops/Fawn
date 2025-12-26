'use client';

import { useEffect, useState } from 'react';
import { api, UserProfile, Goal, Memory } from '@/lib/api';
import { MessageCircle, Brain, Target, Phone } from 'lucide-react';

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileData, goalsData, memoriesData] = await Promise.all([
          api.getMe(),
          api.getGoals('active'),
          api.getMemories({ limit: 5 }),
        ]);
        setProfile(profileData);
        setGoals(goalsData.goals);
        setRecentMemories(memoriesData.memories);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Welcome back{profile?.name ? `, ${profile.name}` : ''}
      </h1>
      <p className="text-gray-600 mb-8">Here's what's happening with your Fawn</p>

      {/* Companion Number Card */}
      {profile?.companionNumber && (
        <div className="bg-fawn-50 border border-fawn-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-fawn-100 rounded-full">
              <Phone className="w-6 h-6 text-fawn-600" />
            </div>
            <div>
              <p className="text-sm text-fawn-600 font-medium">Your Companion's Number</p>
              <p className="text-2xl font-bold text-fawn-800">{profile.companionNumber}</p>
              <p className="text-sm text-fawn-600 mt-1">
                Save this contact and start texting!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<MessageCircle className="w-5 h-5 text-fawn-500" />}
          label="Conversations"
          value="—"
          sublabel="messages exchanged"
        />
        <StatCard
          icon={<Brain className="w-5 h-5 text-fawn-500" />}
          label="Memories"
          value={recentMemories.length.toString()}
          sublabel="facts remembered"
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-fawn-500" />}
          label="Active Goals"
          value={goals.length.toString()}
          sublabel="in progress"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Active Goals */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Active Goals</h2>
          {goals.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No active goals yet. Tell your companion about a goal to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 4).map((goal) => (
                <div key={goal.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{goal.title}</p>
                    <p className="text-sm text-gray-500">{goal.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-fawn-600">
                      {goal.progressPercentage}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Memories */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Memories</h2>
          {recentMemories.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No memories yet. Start chatting with your companion!
            </p>
          ) : (
            <div className="space-y-3">
              {recentMemories.map((memory) => (
                <div key={memory.id} className="border-l-2 border-fawn-200 pl-3">
                  <p className="text-gray-800 text-sm">{memory.content}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">
                    {memory.category}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{sublabel}</p>
    </div>
  );
}
