
import { create } from 'zustand';
import { mockTrips } from '@/lib/mock-data';
import type { Trip } from '@/lib/types';

type TripsStore = {
  trips: Trip[];
  setTrips: (trips: Trip[]) => void;
  addTrip: (trip: Trip) => void;
  updateTrip: (tripId: string, updatedData: Partial<Trip>) => void;
  removeTrip: (tripId: string) => void;
};

export const useTripsStore = create<TripsStore>((set) => ({
  trips: mockTrips,
  setTrips: (trips) => set({ trips }),
  addTrip: (trip) => set((state) => ({ trips: [...state.trips, trip] })),
  updateTrip: (tripId, updatedData) =>
    set((state) => ({
      trips: state.trips.map((trip) =>
        trip.id === tripId ? { ...trip, ...updatedData } : trip
      ),
    })),
  removeTrip: (tripId) =>
    set((state) => ({
      trips: state.trips.filter((trip) => trip.id !== tripId),
    })),
}));
