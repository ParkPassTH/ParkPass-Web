import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseSlotAvailabilityProps {
  spotId: string;
  totalSlots: number;
  date?: string; // YYYY-MM-DD format
  timeSlot?: string; // HH:MM format
}

interface SlotAvailability {
  availableSlots: number;
  bookedSlots: number;
  loading: boolean;
}

// Global subscription manager to prevent duplicate subscriptions
class SubscriptionManager {
  private static instance: SubscriptionManager;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private subscribers: Map<string, Set<() => void>> = new Map();

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  subscribe(channelName: string, spotId: string, callback: () => void): void {
    // Add callback to subscribers
    if (!this.subscribers.has(channelName)) {
      this.subscribers.set(channelName, new Set());
    }
    this.subscribers.get(channelName)!.add(callback);

    // Create subscription only if it doesn't exist
    if (!this.subscriptions.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'bookings',
            filter: `spot_id=eq.${spotId}`
          }, 
          (payload) => {
            console.log('Booking change detected for slot availability:', payload);
            // Notify all subscribers with a delay to prevent rapid refetches
            setTimeout(() => {
              const callbacks = this.subscribers.get(channelName);
              if (callbacks) {
                callbacks.forEach(cb => {
                  try {
                    cb();
                  } catch (error) {
                    console.error('Error in subscription callback:', error);
                  }
                });
              }
            }, 100);
          }
        )
        .subscribe();
      
      this.subscriptions.set(channelName, channel);
    }
  }

  unsubscribe(channelName: string, callback: () => void): void {
    // Remove callback from subscribers
    const callbacks = this.subscribers.get(channelName);
    if (callbacks) {
      callbacks.delete(callback);
      
      // If no more subscribers, remove the subscription
      if (callbacks.size === 0) {
        this.subscribers.delete(channelName);
        const channel = this.subscriptions.get(channelName);
        if (channel) {
          channel.unsubscribe();
          this.subscriptions.delete(channelName);
        }
      }
    }
  }
}

export function useSlotAvailability({
  spotId,
  totalSlots,
  date,
  timeSlot
}: UseSlotAvailabilityProps): SlotAvailability {
  const [availableSlots, setAvailableSlots] = useState(totalSlots);
  const [bookedSlots, setBookedSlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const callbackRef = useRef<(() => void) | null>(null);

  const calculateAvailability = async () => {
    try {
      setLoading(true);

      if (date && timeSlot) {
        // Calculate for specific time slot
        const startDateTime = new Date(`${date}T${timeSlot}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour

        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('id, start_time, end_time, status')
          .eq('spot_id', spotId)
          .in('status', ['confirmed', 'active'])
          .lt('start_time', endDateTime.toISOString())
          .gt('end_time', startDateTime.toISOString());

        if (error) {
          console.error('Error fetching bookings for time slot:', error);
          if (isMountedRef.current) {
            setBookedSlots(0);
            setAvailableSlots(totalSlots);
          }
          return;
        }

        const activeBookingsCount = bookings?.length || 0;
        console.log(`Slot availability - Spot: ${spotId}, Time: ${timeSlot}, Total: ${totalSlots}, Booked: ${activeBookingsCount}, Available: ${Math.max(0, totalSlots - activeBookingsCount)}`);
        
        if (isMountedRef.current) {
          setBookedSlots(activeBookingsCount);
          setAvailableSlots(Math.max(0, totalSlots - activeBookingsCount));
        }

      } else {
        // Calculate for next 2 hours from now (for parking spot cards)
        const now = new Date();
        const nowISOString = now.toISOString();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours
        const twoHoursLaterISOString = twoHoursLater.toISOString();

        // Query all bookings that could affect the next 2 hours
        // Get bookings that overlap with the next 2 hours window
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('id, start_time, end_time, status')
          .eq('spot_id', spotId)
          .in('status', ['confirmed', 'active'])
          .lt('start_time', twoHoursLaterISOString)
          .gt('end_time', nowISOString);

        if (error) {
          console.error('Error fetching bookings for next 2 hours:', error);
          if (isMountedRef.current) {
            setBookedSlots(0);
            setAvailableSlots(totalSlots);
          }
          return;
        }

        // Calculate the minimum available slots in the next 2 hours
        // We'll check availability at different time points to find the worst-case scenario
        let minAvailableSlots = totalSlots;
        
        // Check availability at multiple time points within the 2-hour window
        const checkPoints = [
          now, // Right now
          new Date(now.getTime() + 30 * 60 * 1000), // +30 minutes
          new Date(now.getTime() + 60 * 60 * 1000), // +1 hour
          new Date(now.getTime() + 90 * 60 * 1000), // +1.5 hours
          twoHoursLater // +2 hours
        ];

        console.log(`\n🔍 Checking slot availability for spot ${spotId}:`);
        console.log(`📅 Current time: ${now.toLocaleString()}`);
        console.log(`📅 Time window: ${now.toLocaleString()} - ${twoHoursLater.toLocaleString()}`);
        console.log(`🏗️ Total slots: ${totalSlots}`);
        console.log(`📋 Found ${bookings?.length || 0} bookings that overlap with time window:`);
        
        bookings?.forEach((booking, index) => {
          console.log(`  ${index + 1}. Booking ID: ${booking.id}, Time: ${new Date(booking.start_time).toLocaleString()} - ${new Date(booking.end_time).toLocaleString()}, Status: ${booking.status}`);
        });

        for (const checkTime of checkPoints) {
          const checkTimeISO = checkTime.toISOString();
          
          // Count bookings active at this specific time
          const activeBookings = bookings?.filter(booking => 
            booking.start_time <= checkTimeISO && booking.end_time > checkTimeISO
          ) || [];
          
          const activeAtThisTime = activeBookings.length;
          const availableAtThisTime = Math.max(0, totalSlots - activeAtThisTime);
          
          console.log(`⏰ ${checkTime.toLocaleString()}: ${activeAtThisTime} active bookings, ${availableAtThisTime} slots available`);
          if (activeBookings.length > 0) {
            activeBookings.forEach(booking => {
              console.log(`    - Booking ${booking.id}: ${new Date(booking.start_time).toLocaleString()} - ${new Date(booking.end_time).toLocaleString()}`);
            });
          }
          
          minAvailableSlots = Math.min(minAvailableSlots, availableAtThisTime);
        }

        console.log(`✅ Final result: ${minAvailableSlots} slots available (minimum in next 2 hours)\n`);
        
        if (isMountedRef.current) {
          setBookedSlots(totalSlots - minAvailableSlots);
          setAvailableSlots(minAvailableSlots);
        }
      }

    } catch (err) {
      console.error('Error calculating availability:', err);
      if (isMountedRef.current) {
        setBookedSlots(0);
        setAvailableSlots(totalSlots);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    if (spotId) {
      calculateAvailability();

      // Create deterministic channel name based on spot, date, and timeSlot
      const channelName = `slot_availability_${spotId}_${date || 'next2hrs'}_${timeSlot || 'now'}`;
      
      // Create callback that checks if component is still mounted
      const callback = () => {
        if (isMountedRef.current) {
          calculateAvailability();
        }
      };
      callbackRef.current = callback;

      // Subscribe using the subscription manager
      const subscriptionManager = SubscriptionManager.getInstance();
      subscriptionManager.subscribe(channelName, spotId, callback);
    }

    return () => {
      isMountedRef.current = false;
      
      // Unsubscribe using the subscription manager
      if (callbackRef.current && spotId) {
        const channelName = `slot_availability_${spotId}_${date || 'next2hrs'}_${timeSlot || 'now'}`;
        const subscriptionManager = SubscriptionManager.getInstance();
        subscriptionManager.unsubscribe(channelName, callbackRef.current);
        callbackRef.current = null;
      }
    };
  }, [spotId, totalSlots, date, timeSlot]);

  return { availableSlots, bookedSlots, loading };
}
