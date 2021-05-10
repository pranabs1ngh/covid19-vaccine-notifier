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
    vaccine_fees: {
      vaccine: "COVAXIN" | "COVISHIELD";
      fee: string;
    }[];
  }[];
}

interface Session {
  session_id: string;
  date: string;
  available_capacity: number;
  min_age_limit: number;
  vaccine: "COVAXIN" | "COVISHIELD";
  slots: string[];
  fee?: string;
}

export interface AvailableSlot {
  centerName: string;
  address: string;
  pincode: number;
  fee_type: string;
  sessions: Omit<Session, "session_id" | "slots">[];
}

const env = process.env;
export const keys = {
  port: env.PORT,
  proxyIp: env.PROXY_IP,
  proxyPort: env.PROXY_PORT,
  botToken: env.BOT_TOKEN,
  districtId: env.DISTRICT_ID,
  chatId: env.CHAT_ID,
};
