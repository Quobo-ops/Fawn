import Link from 'next/link';
import { MessageCircle, Brain, Target, Calendar, Users, Settings } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-fawn-50 to-white">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-fawn-800 mb-4">Fawn</h1>
        <p className="text-xl text-fawn-600 mb-8">
          Your AI companion that lives in your text messages
        </p>
        <p className="text-gray-600 max-w-2xl mx-auto mb-12">
          A personal AI that knows your life context. Schedule, search, track goals,
          and evolve - all through a simple text conversation.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="bg-fawn-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-fawn-700 transition"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="border border-fawn-300 text-fawn-700 px-8 py-3 rounded-lg font-medium hover:bg-fawn-50 transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
          Everything through a text thread
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard
            icon={<MessageCircle className="w-8 h-8 text-fawn-500" />}
            title="Native SMS Interface"
            description="No app to open. Just text your companion like you would a friend. It's always there in your messages."
          />
          <FeatureCard
            icon={<Brain className="w-8 h-8 text-fawn-500" />}
            title="Life Context Memory"
            description="Fawn remembers everything you tell it. Your preferences, your people, your history - always in context."
          />
          <FeatureCard
            icon={<Target className="w-8 h-8 text-fawn-500" />}
            title="Goals & Habits"
            description="Set goals through conversation. Track progress. Get gentle accountability and encouragement."
          />
          <FeatureCard
            icon={<Calendar className="w-8 h-8 text-fawn-500" />}
            title="Scheduling & Reminders"
            description="'Remind me to call mom tomorrow' - done. Natural language scheduling that just works."
          />
          <FeatureCard
            icon={<Users className="w-8 h-8 text-fawn-500" />}
            title="Relationship Memory"
            description="Never forget important details about the people in your life. Birthdays, preferences, shared memories."
          />
          <FeatureCard
            icon={<Settings className="w-8 h-8 text-fawn-500" />}
            title="Your Personality, Your Rules"
            description="Configure how Fawn talks to you. Warm or direct? Funny or serious? Set restrictions and preferences."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-fawn-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            How it works
          </h2>

          <div className="max-w-3xl mx-auto space-y-8">
            <Step number={1} title="Create your account">
              Sign up and we'll assign you a dedicated phone number. That's your companion's number.
            </Step>
            <Step number={2} title="Save the contact">
              Add the number to your contacts. Name it whatever feels right. That's your Fawn.
            </Step>
            <Step number={3} title="Start texting">
              Just text. Tell it about your day. Ask it to remember things. Set goals. It learns as you go.
            </Step>
            <Step number={4} title="Customize in the dashboard">
              Use this web interface to fine-tune the personality, set rules, and review your life data.
            </Step>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-500">
        <p>&copy; 2024 Fawn. Your life, in context.</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-6">
      <div className="flex-shrink-0 w-10 h-10 bg-fawn-500 text-white rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
        <p className="text-gray-600">{children}</p>
      </div>
    </div>
  );
}
