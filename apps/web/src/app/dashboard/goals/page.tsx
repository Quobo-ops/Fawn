'use client';

import { useEffect, useState } from 'react';
import { api, Goal } from '@/lib/api';
import { Target, Plus, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  useEffect(() => {
    loadGoals();
  }, [filter]);

  async function loadGoals() {
    setLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const data = await api.getGoals(status);
      setGoals(data.goals);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Goals</h1>
          <p className="text-gray-600">Track your progress and achievements</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['active', 'completed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium transition capitalize',
              filter === f
                ? 'bg-fawn-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Goals List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No goals yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Tell your companion about a goal to get started!
          </p>
          <p className="text-sm text-gray-400 mt-4 max-w-md mx-auto">
            Try texting: "I want to read 20 books this year" or "Help me track my meditation habit"
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const isCompleted = goal.status === 'completed';

  return (
    <div
      className={clsx(
        'bg-white border rounded-xl p-5',
        isCompleted ? 'border-green-200 bg-green-50/50' : 'border-gray-200'
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={clsx(
            'p-2 rounded-lg',
            isCompleted ? 'bg-green-100' : 'bg-fawn-50'
          )}
        >
          {isCompleted ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <Target className="w-5 h-5 text-fawn-600" />
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{goal.title}</h3>
          {goal.description && (
            <p className="text-gray-600 text-sm mt-1">{goal.description}</p>
          )}

          <div className="flex items-center gap-4 mt-3">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded capitalize">
              {goal.type}
            </span>
            {goal.targetDate && (
              <span className="text-xs text-gray-500">
                Due: {new Date(goal.targetDate).toLocaleDateString()}
              </span>
            )}
          </div>

          {!isCompleted && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-fawn-600">
                  {goal.progressPercentage}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-fawn-500 rounded-full transition-all duration-500"
                  style={{ width: `${goal.progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
