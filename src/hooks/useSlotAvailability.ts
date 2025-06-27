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
        // For daily/monthly bookings, we check the whole day
        if (bookingType === 'daily' || bookingType === 'monthly') {
          // Calculate for full day
          const startDateTime = new Date(`${date}T00:00:00+07:00`);
          const endDateTime = new Date(`${date}T23:59:59+07:00`);
          
          console.log(`📅 Daily slot calculation:`, {
            inputDate: date,
            bookingType,
            startDateTimeUTC: startDateTime.toISOString(),
            endDateTimeUTC: endDateTime.toISOString(),
            startDateTimeLocal: startDateTime.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
            endDateTimeLocal: endDateTime.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
          });

          // Check for bookings that overlap with this day
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, start_time, end_time, status, booking_type')
            .eq('spot_id', spotId)
            .in('status', ['confirmed', 'active'])
            .or(`and(start_time.lte.${endDateTime.toISOString()},end_time.gte.${startDateTime.toISOString()})`);

          if (bookingsError) {
            console.error('❌ Error fetching daily bookings:', bookingsError);
          }

          // Count how many slots are taken for this day
          let bookedSlotsCount = 0;
          if (bookings) {
            bookings.forEach((booking: any) => {
              // For daily/monthly bookings, each booking takes 1 slot for the entire day
              // For hourly bookings, we only count if they're on this specific day
              if (booking.booking_type === 'daily' || booking.booking_type === 'monthly') {
                bookedSlotsCount += 1;
              } else if (booking.booking_type === 'hourly') {
                // Only count hourly bookings that are specifically on this day
                const bookingStart = new Date(booking.start_time);
                const bookingDay = bookingStart.toISOString().split('T')[0];
                if (bookingDay === date) {
                  bookedSlotsCount += 1;
                }
              }
            });
          }

          const calculatedAvailable = Math.max(0, totalSlots - bookedSlotsCount);
          
          console.log(`📊 Daily availability calculated:`, {
            totalSlots,
            bookedSlotsCount,
            availableSlots: calculatedAvailable,
            bookings: bookings?.map(b => ({
              id: b.id,
              type: b.booking_type,
              start_time: b.start_time,
              end_time: b.end_time,
              status: b.status
            })) || []
          });

          if (isMountedRef.current) {
            setAvailableSlots(calculatedAvailable);
            setBookedSlots(bookedSlotsCount);
            setLoading(false);
          }
        } else {
          // Calculate for specific time slot (hourly)
          const startDateTime = new Date(`${date}T${timeSlot}:00+07:00`);
          const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
          
          console.log(`⏰ Time slot calculation:`, {
            inputDate: date,
            inputTimeSlot: timeSlot,
            startDateTimeUTC: startDateTime.toISOString(),
            endDateTimeUTC: endDateTime.toISOString(),
            startDateTimeLocal: startDateTime.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
            endDateTimeLocal: endDateTime.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
          });

          // Check for bookings
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, start_time, end_time, status')
            .eq('spot_id', spotId)
            .in('status', ['confirmed', 'active'])
            .lt('start_time', endDateTime.toISOString())
            .gt('end_time', startDateTime.toISOString());

          if (bookingsError) {
            console.error('❌ Error fetching bookings:', bookingsError);
          }

          console.log(`📋 Bookings query result:`, {
            count: bookings?.length || 0,
            query: {
              spot_id: spotId,
              status: ['confirmed', 'active'],
              start_time_lt: endDateTime.toISOString(),
              end_time_gt: startDateTime.toISOString()
            },
            bookings: bookings?.map(b => ({
              id: b.id,
              start_time: b.start_time,
              end_time: b.end_time,
              status: b.status,
              start_local: new Date(b.start_time).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
              end_local: new Date(b.end_time).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
            })) || []
          });
          // Query blocked slots (only for hourly bookings)
          console.log(`🔍 Querying parking_availability table for spot: ${spotId}`);
          const { data: blockedSlots, error: blockedError } = await supabase
            .from('parking_availability')
            .select('id, start_time, end_time, status, slots_affected')
            .eq('spot_id', spotId)
            .in('status', ['blocked', 'maintenance']);

          if (blockedError) {
            console.error('❌ Error fetching blocked slots:', blockedError);
          }

          // Filter overlapping blocks
          const overlappingBlocks = blockedSlots?.filter(block => {
            const blockStart = new Date(block.start_time);
            const blockEnd = new Date(block.end_time);
            const hasOverlap = startDateTime < blockEnd && endDateTime > blockStart;
            
            console.log(`🔍 Checking overlap for block ${block.id}:`, {
              blockId: block.id,
              blockStart: blockStart.toISOString(),
              blockEnd: blockEnd.toISOString(),
              blockLocalStart: blockStart.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
              blockLocalEnd: blockEnd.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
              slotStart: startDateTime.toISOString(),
              slotEnd: endDateTime.toISOString(),
              slotLocalStart: startDateTime.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
              slotLocalEnd: endDateTime.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
              hasOverlap,
              slots_affected: block.slots_affected,
              overlapCondition: {
                'slot.start < block.end': startDateTime < blockEnd,
                'slot.end > block.start': endDateTime > blockStart
              }
            });
            
            return hasOverlap;
          }) || [];

          const activeBookingsCount = bookings?.length || 0;
          const blockedSlotsCount = overlappingBlocks?.reduce((total, slot) => total + slot.slots_affected, 0) || 0;
          const totalUnavailable = activeBookingsCount + blockedSlotsCount;
          const availableCount = Math.max(0, totalSlots - totalUnavailable);
          
          console.log(`🧮 Final calculation for slot ${timeSlot}:`, {
            totalSlots,
            activeBookingsCount,
            overlappingBlocksCount: overlappingBlocks.length,
            blockedSlotsCount,
            totalUnavailable,
            availableCount,
            calculation: `${totalSlots} - (${activeBookingsCount} + ${blockedSlotsCount}) = ${availableCount}`,
            bookings: bookings || [],
            overlappingBlockDetails: overlappingBlocks
          });

          if (isMountedRef.current) {
            setAvailableSlots(availableCount);
            setBookedSlots(activeBookingsCount);
            setLoading(false);
          }
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
