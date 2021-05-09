import * as TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import { CoWinRes, AvailableSlot } from "./type";

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.BOT_TOKEN;
const cowinApi =
  "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=725&date=09-05-2021";

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token);

const fetchVaccinationSlotsInKolkata = () =>
  fetch(cowinApi, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36",
    },
  }).then((res) => res.json());

const availableSlotsMap: Map<number, AvailableSlot> = new Map();
const oldSlotsMap: Map<number, AvailableSlot> = new Map();

const getEmptyVaccinationSlots = async () => {
  setInterval(async () => {
    availableSlotsMap.clear();
    const vacSlots: CoWinRes = await fetchVaccinationSlotsInKolkata();
    vacSlots.centers.forEach((center) => {
      center.sessions.forEach((s) => {
        if (s.available_capacity > 0) {
          const { available_capacity, vaccine, date, min_age_limit } = s;
          const savedSlot = availableSlotsMap.get(center.center_id);
          if (savedSlot) {
            const sessions = savedSlot.sessions;
            sessions.push({ available_capacity, vaccine, date, min_age_limit });
            availableSlotsMap.set(center.center_id, { ...savedSlot, sessions });
          } else {
            availableSlotsMap.set(center.center_id, {
              centerName: center.name,
              address: center.address,
              pincode: center.pincode,
              fee_type: center.fee_type,
              sessions: [{ available_capacity, vaccine, date, min_age_limit }],
            });
          }
        }
      });
    });
    if (availableSlotsMap.size) {
      availableSlotsMap.forEach((currSlot, k) => {
        const oldSlot = oldSlotsMap.get(k);
        if (oldSlot) {
          const newSessions = currSlot.sessions.filter((s) => {
            for (const os of oldSlot.sessions) {
              return (
                os.date === s.date &&
                os.vaccine === s.vaccine &&
                os.available_capacity !== s.available_capacity
              );
            }
          });
          if (newSessions.length) {
            oldSlotsMap.set(k, { ...currSlot, sessions: newSessions });
            availableSlotsMap.set(k, { ...currSlot, sessions: newSessions });
          } else {
            availableSlotsMap.delete(k);
          }
        } else {
          oldSlotsMap.set(k, currSlot);
        }
      });
    }
    if (availableSlotsMap.size) {
      let flag = true;
      availableSlotsMap.forEach((s) => {
        if (flag) {
          const message = `*Center Name*: ${s.centerName}\n*Address*: ${s.address} ${
            s.pincode
          }\n*Fee*: ${s.fee_type}\n${s.sessions
            .map(
              (ses) =>
                `\n*Date*: ${ses.date}\n*Vaccine*: ${ses.vaccine}\n*Number of vaccines available*: ${ses.available_capacity}\n*Age*: ${ses.min_age_limit}\n`
            )
            .join("")}
            `;
          bot.sendMessage("1138648959", message, { parse_mode: "Markdown" });
          flag = false;
        }
      });
    }
  }, 1000);
};

getEmptyVaccinationSlots();
