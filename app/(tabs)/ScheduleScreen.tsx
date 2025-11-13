import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { Calendar } from 'react-native-calendars'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router';
import { useThemeColor } from '@/contexts/ThemeColorContext';

interface Event {
  id: string;
  title: string;
  time: string;
  type: 'appointment' | 'reminder';
  description?: string;
}

interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  };
}

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const router = useRouter()
  const { primaryColor } = useThemeColor();

  // Example events data
  const events: { [date: string]: Event[] } = {
    '2025-10-15': [
      { id: '1', title: 'Dermatologist Appointment', time: '10:00 AM', type: 'appointment', description: 'Annual skin check-up' },
      { id: '2', title: 'Apply Moisturizer', time: '8:00 PM', type: 'reminder', description: 'Evening skincare routine' },
    ],
    '2025-10-18': [
      { id: '3', title: 'Sunscreen Reminder', time: '7:00 AM', type: 'reminder', description: 'Apply SPF 50+' },
    ],
    '2025-10-20': [
      { id: '4', title: 'Follow-up Consultation', time: '2:30 PM', type: 'appointment', description: 'Review treatment progress' },
    ],
    '2025-10-22': [
      { id: '5', title: 'Medication Reminder', time: '9:00 AM', type: 'reminder', description: 'Take prescribed medication' },
      { id: '6', title: 'Hydration Check', time: '12:00 PM', type: 'reminder', description: 'Drink water for skin health' },
    ],
  };

  // Mark dates with events
  const markedDates: MarkedDates = {};
  Object.keys(events).forEach((date) => {
    markedDates[date] = {
      marked: true,
      dotColor: '#007AFF',
    };
  });

  // Highlight selected date
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: primaryColor,
    };
  }

  const selectedEvents = events[selectedDate] || [];

  const getEventIcon = (type: string) => {
    return type === 'appointment' ? 'calendar' : 'notifications';
  };

  const getEventColor = (type: string) => {
    return type === 'appointment' ? '#E91E63' : '#FF9800';
  };

  const handleNavigation = (path: string) => {
    router.push(path as any);
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#666',
              selectedDayBackgroundColor: '#007AFF',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#007AFF',
              dayTextColor: '#1A1A1A',
              textDisabledColor: '#d9d9d9',
              dotColor: '#007AFF',
              selectedDotColor: '#ffffff',
              arrowColor: '#007AFF',
              monthTextColor: '#1A1A1A',
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '500',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />
        </View>

        {/* Events List */}
        <View style={styles.eventsContainer}>
          <Text style={styles.eventsTitle}>
            Events for {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>

          {selectedEvents.length === 0 ? (
            <View style={styles.noEventsContainer}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.noEventsText}>No events scheduled for this day</Text>
            </View>
          ) : (
            selectedEvents.map((event) => (
              <TouchableOpacity key={event.id} style={styles.eventCard} activeOpacity={0.8}>
                <View style={[styles.eventIconContainer, { backgroundColor: `${getEventColor(event.type)}20` }]}>
                  <Ionicons name={getEventIcon(event.type) as any} size={24} color={getEventColor(event.type)} />
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>
                    <Ionicons name="time-outline" size={14} color="#666" /> {event.time}
                  </Text>
                  {event.description && (
                    <Text style={styles.eventDescription}>{event.description}</Text>
                  )}
                </View>
                <View style={[styles.eventBadge, { backgroundColor: getEventColor(event.type) }]}>
                  <Text style={styles.eventBadgeText}>
                    {event.type === 'appointment' ? 'Appointment' : 'Reminder'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Add Event Button */}
        <TouchableOpacity style={[styles.addButton, { backgroundColor: primaryColor }]} activeOpacity={0.8} onPress={() => handleNavigation('/(stacks)/DermatologistListScreen')}>
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Book a Consultation</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  eventsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  noEventsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  eventIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  eventBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  eventBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});