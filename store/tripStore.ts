import { create } from "zustand";
import { Trip } from "@/lib/tripService";
import { getTrips } from "@/lib/tripService";

interface TripState {
  trips: Trip[];
  loading: boolean;
  fetchTrips: (user: any) => Promise<void>;
  setTrips: (trips: Trip[]) => void;
}

export const useTripStore = create<TripState>((set) => ({
  trips: [],
  loading: false,

  fetchTrips: async (user) => {
    if (!user) return;

    set({ loading: true });
    const trips = await getTrips(user);
    set({ trips, loading: false });
  },

  setTrips: (trips) => set({ trips }),
}));
