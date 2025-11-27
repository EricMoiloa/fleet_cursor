
import { create } from 'zustand';
import { mockVehicles } from '@/lib/mock-data';
import type { Vehicle } from '@/lib/types';

type VehiclesStore = {
  vehicles: Vehicle[];
  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicle: (vehicleId: string, updatedData: Partial<Vehicle>) => void;
  removeVehicle: (vehicleId: string) => void;
};

export const useVehiclesStore = create<VehiclesStore>((set) => ({
  vehicles: mockVehicles,
  setVehicles: (vehicles) => set({ vehicles }),
  addVehicle: (vehicle) => set((state) => ({ vehicles: [...state.vehicles, vehicle] })),
  updateVehicle: (vehicleId, updatedData) =>
    set((state) => ({
      vehicles: state.vehicles.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, ...updatedData } : vehicle
      ),
    })),
  removeVehicle: (vehicleId) =>
    set((state) => ({
      vehicles: state.vehicles.filter((vehicle) => vehicle.id !== vehicleId),
    })),
}));
