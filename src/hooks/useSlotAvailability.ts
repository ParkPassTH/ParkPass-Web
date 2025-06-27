import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseSlotAvailabilityProps {
  spotId: string;
  totalSlots: number;
  date?: string; // YYYY-MM-DD format
  timeSlot?: string; // HH:MM format
  bookingType?: 'hourly' | 'daily' | 'monthly';
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
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'parking_availability',
            filter: `spot_id=eq.${spotId}`
          }, 
          (payload) => {
            console.log('Parking availability change detected for slot availability:', payload);
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
  timeSlot,
  bookingType = 'hourly'
}: UseSlotAvailabilityProps): SlotAvailability {
  const [availableSlots, setAvailableSlots] = useState(totalSlots);
  const [bookedSlots, setBookedSlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const callbackRef = useRef<(() => void) | null>(null);

  const calculateAvailability = async () => {
    try {
      setLoading(true);
      console.log(`🚀 Starting availability calculation for spot: ${spotId}, totalSlots: ${totalSlots}, date: ${date}, timeSlot: ${timeSlot}`);

      if (date && timeSlot) {
        // สำหรับ daily/monthly: เช็คทั้งวัน, hourly: เช็ค slot นั้น
        let startDateTime: Date, endDateTime: Date;
        if (bookingType === 'daily' || bookingType === 'monthly') {
          startDateTime = new Date(`${date}T00:00:00+07:00`);
          endDateTime = new Date(`${date}T23:59:59+07:00`);
        } else {
          startDateTime = new Date(`${date}T${timeSlot}:00+07:00`);
          endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
        }

        // Query bookings ทุกประเภทที่ทับช่วงเวลา
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, start_time, end_time, status, booking_type')
          .eq('spot_id', spotId)
          .in('status', ['confirmed', 'active'])
          .or(`and(start_time.lte.${endDateTime.toISOString()},end_time.gte.${startDateTime.toISOString()})`);

        if (bookingsError) {
          console.error('❌ Error fetching bookings:', bookingsError);
        }

        // Query blocked slots (เช่นเดิม)
        const { data: blockedSlots, error: blockedError } = await supabase
          .from('parking_availability')
          .select('id, start_time, end_time, status, slots_affected')
          .eq('spot_id', spotId)
          .in('status', ['blocked', 'maintenance']);

        if (blockedError) {
          console.error('❌ Error fetching blocked slots:', blockedError);
        }

        // Filter bookings ที่ทับช่วงเวลา
        let overlappingBookings = 0;
        if (bookings) {
          bookings.forEach((booking: any) => {
            const bStart = new Date(booking.start_time);
            const bEnd = new Date(booking.end_time);
            if (bStart < endDateTime && bEnd > startDateTime) {
              overlappingBookings += 1;
            }
          });
        }

        // Filter overlapping blocks
        const overlappingBlocks = blockedSlots?.filter(block => {
          const blockStart = new Date(block.start_time);
          const blockEnd = new Date(block.end_time);
          return startDateTime < blockEnd && endDateTime > blockStart;
        }) || [];
        const blockedSlotsCount = overlappingBlocks?.reduce((total, slot) => total + slot.slots_affected, 0) || 0;
        const totalUnavailable = overlappingBookings + blockedSlotsCount;
        const availableCount = Math.max(0, totalSlots - totalUnavailable);

        if (isMountedRef.current) {
          setAvailableSlots(availableCount);
          setBookedSlots(overlappingBookings);
          setLoading(false);
        }
      } else {
        // Calculate for next 2 hours from now (for parking spot cards)
        console.log(`🕐 Calculating for next 2 hours (parking spot card)`);
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        console.log(`⏰ Time range:`, {
          now: now.toISOString(),
          twoHoursLater: twoHoursLater.toISOString(),
          nowLocal: now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
          twoHoursLaterLocal: twoHoursLater.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
        });

        // Query bookings and blocked slots
        const [bookingsResult, blockedResult] = await Promise.all([
          supabase
            .from('bookings')
            .select('id, start_time, end_time, status')
            .eq('spot_id', spotId)
            .in('status', ['confirmed', 'active'])
            .lt('start_time', twoHoursLater.toISOString())
            .gt('end_time', now.toISOString()),
          
          supabase
            .from('parking_availability')
            .select('id, start_time, end_time, status, slots_affected')
            .eq('spot_id', spotId)
            .in('status', ['blocked', 'maintenance'])
        ]);

        if (bookingsResult.error) {
          console.error('❌ Error fetching bookings:', bookingsResult.error);
          if (isMountedRef.current) {
            setBookedSlots(0);
            setAvailableSlots(totalSlots);
          }
          return;
        }

        if (blockedResult.error) {
          console.error('❌ Error fetching blocked slots:', blockedResult.error);
        }

        const bookings = bookingsResult.data || [];
        const blockedSlots = blockedResult.data || [];

        console.log(`📋 Next 2 hours bookings:`, {
          count: bookings.length,
          bookings: bookings.map(b => ({
            id: b.id,
            start: b.start_time,
            end: b.end_time,
            status: b.status
          }))
        });

        console.log(`🚫 Next 2 hours blocked slots:`, {
          count: blockedSlots.length,
          blocks: blockedSlots.map(b => ({
            id: b.id,
            start: b.start_time,
            end: b.end_time,
            status: b.status,
            slots_affected: b.slots_affected
          }))
        });

        // Calculate minimum available slots in the next 2 hours
        let minAvailableSlots = totalSlots;
        
        const checkPoints = [
          now,
          new Date(now.getTime() + 30 * 60 * 1000),
          new Date(now.getTime() + 60 * 60 * 1000),
          new Date(now.getTime() + 90 * 60 * 1000),
          twoHoursLater
        ];

        for (const checkTime of checkPoints) {
          const checkTimeISO = checkTime.toISOString();
          
          const activeBookings = bookings.filter(booking => 
            booking.start_time <= checkTimeISO && booking.end_time > checkTimeISO
          );
          
          const activeBlockedSlots = blockedSlots.filter(block => {
            const blockStart = new Date(block.start_time);
            const blockEnd = new Date(block.end_time);
            return checkTime >= blockStart && checkTime < blockEnd;
          }).reduce((total, block) => total + block.slots_affected, 0);
          
          const totalUnavailable = activeBookings.length + activeBlockedSlots;
          const availableAtThisTime = Math.max(0, totalSlots - totalUnavailable);
          
          minAvailableSlots = Math.min(minAvailableSlots, availableAtThisTime);
        }
        
        console.log(`🧮 Final calculation for next 2 hours:`, {
          totalSlots,
          minAvailableSlots,
          bookedSlots: totalSlots - minAvailableSlots
        });
        
        if (isMountedRef.current) {
          setBookedSlots(totalSlots - minAvailableSlots);
          setAvailableSlots(minAvailableSlots);
          console.log(`✅ State updated (next 2hrs): availableSlots=${minAvailableSlots}, bookedSlots=${totalSlots - minAvailableSlots}`);
        }
      }

    } catch (err) {
      console.error('❌ Error calculating availability:', err);
      if (isMountedRef.current) {
        setBookedSlots(0);
        setAvailableSlots(totalSlots);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        console.log(`✅ Loading complete for ${timeSlot || 'next2hrs'}`);
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
  }, [spotId, totalSlots, date, timeSlot, bookingType]);

  return { availableSlots, bookedSlots, loading };
}
