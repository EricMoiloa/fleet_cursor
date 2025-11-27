import type { User, Ministry, Department, Vehicle, VehicleRequest, Trip, UserRole } from './types';

export const mockUsers: User[] = [
  { id: 'user-sa-1', name: 'Sam Admin', email: 'super@fleetwise.com', role: 'Super Admin', avatarUrl: 'avatar-sa1', isFirstLogin: false },
  { id: 'user-ma-1', name: 'Mary Admin', email: 'ministry@fleetwise.com', role: 'Ministry Admin', ministry: 'Ministry of Transport', avatarUrl: 'avatar-ma1', isFirstLogin: true },
  { id: 'user-fm-1', name: 'Frank Manager', email: 'fleet@fleetwise.com', role: 'Fleet Manager', ministry: 'Ministry of Transport', avatarUrl: 'avatar-fm1', isFirstLogin: false },
  { id: 'user-d-1', name: 'David Driver', email: 'driver@fleetwise.com', role: 'Driver', ministry: 'Ministry of Transport', avatarUrl: 'avatar-d1', isFirstLogin: false },
  { id: 'user-d-2', name: 'Dane Driver', email: 'dane@fleetwise.com', role: 'Driver', ministry: 'Ministry of Transport', avatarUrl: 'avatar-d1', isFirstLogin: false },
  { id: 'user-w-1', name: 'Wendy Worker', email: 'worker@fleetwise.com', role: 'Worker', ministry: 'Ministry of Transport', department: 'Logistics', avatarUrl: 'avatar-w1', isFirstLogin: false },
];

export const getMockUser = (role: UserRole): User => {
  return mockUsers.find(u => u.role === role) || mockUsers[0];
};

export const mockMinistries: Ministry[] = [
  { id: 'min-1', name: 'Ministry of Transport', adminCount: 1, userCount: 15, vehicleCount: 8 },
  { id: 'min-2', name: 'Ministry of Health', adminCount: 1, userCount: 25, vehicleCount: 12 },
  { id: 'min-3', name: 'Ministry of Education', adminCount: 1, userCount: 30, vehicleCount: 10 },
];

export const mockDepartments: Department[] = [
  { id: 'dep-1', name: 'Logistics', ministryId: 'min-1' },
  { id: 'dep-2', name: 'Executive Transport', ministryId: 'min-1' },
  { id: 'dep-3', name: 'Ambulance Services', ministryId: 'min-2' },
];

export const mockVehicles: Vehicle[] = [
  { id: 'veh-1', make: 'Toyota', model: 'Hilux', year: 2022, licensePlate: 'GVT-001', status: 'Available', imageUrl: 'vehicle-hilux', serviceDue: '2024-10-15', mileage: 15000, driverId: 'user-d-2' },
  { id: 'veh-2', make: 'Ford', model: 'Ranger', year: 2021, licensePlate: 'GVT-002', status: 'Assigned', imageUrl: 'vehicle-ranger', serviceDue: '2024-08-20', mileage: 25000, assignedTo: 'trip-1', driverId: 'user-d-1' },
  { id: 'veh-3', make: 'Mercedes-Benz', model: 'V-Class', year: 2023, licensePlate: 'GVT-003', status: 'Maintenance', imageUrl: 'vehicle-vclass', serviceDue: '2024-07-30', mileage: 8000 },
  { id: 'veh-4', make: 'Toyota', model: 'Corolla', year: 2023, licensePlate: 'GVT-004', status: 'Available', imageUrl: 'vehicle-corolla', serviceDue: '2025-01-10', mileage: 5000 },
];

export const mockRequests: VehicleRequest[] = [
  { id: 'req-1', requester: mockUsers[5], origin: 'HQ', destination: 'Port Authority', dateTime: '2024-07-28T09:00:00', purpose: 'Site Inspection', status: 'Pending' },
  { id: 'req-2', requester: mockUsers[5], origin: 'HQ', destination: 'Airport', dateTime: '2024-07-28T14:00:00', purpose: 'VIP Pickup', status: 'Booked', assignedVehicle: mockVehicles[1], assignedDriver: mockUsers[3] },
  { id: 'req-3', requester: mockUsers[5], origin: 'Ministry of Health', destination: 'Regional Clinic', dateTime: '2024-07-29T10:00:00', purpose: 'Medical Supply Delivery', status: 'Queued', eta: '3 hours' },
  { id: 'req-4', requester: mockUsers[5], origin: 'Ministry of Education', destination: 'Rural School Project', dateTime: '2024-07-27T08:00:00', purpose: 'Material Delivery', status: 'Denied' },
  { id: 'req-5', requester: mockUsers[5], origin: 'HQ', destination: 'Conference Center', dateTime: '2024-07-26T11:00:00', purpose: 'Event Support', status: 'Completed', assignedVehicle: mockVehicles[0], assignedDriver: mockUsers[4] },
  { id: 'req-6', requester: mockUsers[5], origin: 'HQ', destination: 'Site B', dateTime: '2024-07-29T11:00:00', purpose: 'Document Transfer', status: 'Pending' },

];

export const mockTrips: Trip[] = [
    { id: 'trip-1', requestId: 'req-2', vehicle: mockVehicles[1], driver: mockUsers[3], startTime: '2024-07-28T14:00:00', status: 'Active', startOdometer: 25000 },
    { id: 'trip-2', requestId: 'req-x', vehicle: mockVehicles[3], driver: mockUsers[4], startTime: '2024-07-29T09:00:00', status: 'Upcoming', startOdometer: 5000 },
    { id: 'trip-3', requestId: 'req-5', vehicle: mockVehicles[0], driver: mockUsers[4], startTime: '2024-07-26T11:00:00', endTime: '2024-07-26T15:00:00', status: 'Completed', startOdometer: 15000, endOdometer: 15150 },

];
