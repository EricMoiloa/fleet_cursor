/** ---------------- Roles ---------------- */
export type UserRole =
  | 'Ministry Admin'
  | 'Fleet Manager'
  | 'Supervisor'
  | 'Driver'
  | 'Worker';

/** ---------------- API user ---------------- */
export type ApiUser = {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: { id?: number; name: UserRole } | UserRole;
  ministry_id?: number | null;
  department_id?: number | null;
  department?: { id: number | string; name: string } | null;
  supervisor_id?: number | null;
  is_first_login?: boolean;
  is_active?: boolean;
};

/** ---------------- UI helpers ---------------- */
export type DepartmentLite = { id: string; name: string };
export type PersonLite = { id: string; name: string; email?: string };

/** ---------------- Unified User ---------------- */
export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  ministry?: string;
  department?: DepartmentLite | null;
  supervisorId?: string | null;
  isFirstLogin?: boolean;
  isActive?: boolean;
};

export function coerceUser(src: Partial<ApiUser> | any): User {
  const roleName =
    typeof src?.role === 'string'
      ? (src.role as UserRole)
      : ((src?.role?.name as UserRole) ?? 'Worker');

  const deptObj = src?.department
    ? { id: String((src.department as any).id), name: String((src.department as any).name ?? '') }
    : src?.department_id != null
    ? { id: String(src.department_id), name: '' }
    : null;

  return {
    id: String(src?.id ?? ''),
    name: String(src?.name ?? ''),
    email: String(src?.email ?? ''),
    role: roleName,
    avatarUrl: src?.avatar_url ?? undefined,
    ministry: src?.ministry_id != null ? String(src.ministry_id) : undefined,
    department: deptObj,
    supervisorId: src?.supervisor_id != null ? String(src.supervisor_id) : null,
    isFirstLogin: src?.is_first_login ?? undefined,
    isActive: src?.is_active ?? undefined,
  };
}

/** ---------------- Vehicles & Requests ---------------- */
export type VehicleLite = {
  id: string;
  make?: string;
  model?: string;
  plate_number?: string; // backend field
};

export type VehicleStatus = 'Available' | 'Assigned' | 'Maintenance' | 'Unavailable';

export interface Vehicle {
  id: string;
  make?: string;
  model?: string;
  year?: number | string;
  plate_number?: string;        // use this in UI
  status?: VehicleStatus;
  department_id?: number | null;
}

/** Form used by RequestVehicleModal and worker pages */
export type RequestVehicleForm = {
  purpose?: string;
  origin?: string;
  destination?: string;
  datetime?: string;      // ISO
  vehicle_id?: string;    // snake_case
};



/** Fleet Manager board item */
// lib/types.ts
export type SupervisorDecision = 'pending' | 'approved' | 'denied';

export type FMRequest = {
  id: string;
  status: 'Pending' | 'Approved' | 'Queued' | 'Booked' | 'Active' | 'Completed' | 'Denied' | string;
  purpose?: string;
  origin?: string;
  destination?: string;
  dateTime?: string;
  requester?: { id: string; name: string; email?: string } | null;
  driver?: any | null;
  vehicle?: any | null;
  department?: string | null;
  supervisorDecision?: SupervisorDecision;   // ⬅️ NEW
};


/** Trip cards */
export type TripLite = {
  id: string;
  requestId?: string;
  status: 'Pending' | 'Active' | 'Upcoming' | 'Completed';
  vehicle: VehicleLite;
  driver: PersonLite;
  startTime?: string;
  destination?: string;

  startOdometer?: number;
  endOdometer?: number | null;
};
// keep your existing RequestStatus = 'Pending' | 'Approved' | 'Denied' | ... etc.


export type RequestStatus =
  | 'Pending'
  | 'Approved'
  | 'Denied'
  | 'Completed'
  | 'Active'
  | 'Queued'
  | 'Booked';

export type RequestStatusUI = RequestStatus | 'Pending Supervisor';

export type VehicleRequest = {
  id: string;
  purpose?: string | null;
  origin?: string | null;
  destination?: string | null;
  dateTime?: string | null;
  status: RequestStatusUI;
  requester: {
    id?: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
  /** set true client-side when supervisor took an action */
  supervisorDecision?: SupervisorDecision;
};


