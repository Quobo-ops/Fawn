'use client';

import { useEffect, useState } from 'react';
import { api, Event } from '@/lib/api';
import { Calendar, Clock, MapPin } from 'lucide-react';

export default function SchedulePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await api.getEvents();
        setEvents(data.events);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.startTime).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Schedule</h1>
        <p className="text-gray-600">Your upcoming events and reminders</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading schedule...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No upcoming events</p>
          <p className="text-sm text-gray-400 mt-1">
            Tell your companion to schedule something!
          </p>
          <p className="text-sm text-gray-400 mt-4 max-w-md mx-auto">
            Try texting: "Schedule a dentist appointment next Tuesday at 2pm"
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {formatDate(date)}
              </h2>
              <div className="space-y-3">
                {dayEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
}

function EventCard({ event }: { event: Event }) {
  const startTime = new Date(event.startTime);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-fawn-50 rounded-lg">
          <Calendar className="w-5 h-5 text-fawn-600" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{event.title}</h3>
          {event.description && (
            <p className="text-gray-600 text-sm mt-1">{event.description}</p>
          )}

          <div className="flex items-center gap-4 mt-2">
            <span className="inline-flex items-center gap-1 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              {startTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                {event.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
