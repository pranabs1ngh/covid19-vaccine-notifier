export interface CoWinRes {
  centers: {
    center_id: number;
    name: string;
    address: string;
    state_name: string;
    district_name: string;
    block_name: string;
    pincode: number;
    lat: number;
    long: number;
    from: string;
    to: string;
    fee_type: "Free" | "Paid";
    sessions: Session[];
  }[];
}

interface Session {
  session_id: string;
  date: string;
  available_capacity: number;
  min_age_limit: number;
  vaccine: "COVAXIN" | "COVISHIELD";
  slots: string[];
}

export interface AvailableSlot {
  centerName: string;
  address: string;
  pincode: number;
  fee_type: string;
  sessions: Omit<Session, "session_id" | "slots">[];
}
