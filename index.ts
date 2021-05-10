import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import { CoWinRes, AvailableSlot, keys } from "./type";
import SocksProxyAgent from "socks-proxy-agent";
import http from "http";

const dateObj = new Date();
const date = `${dateObj.getDate()}-${dateObj.getMonth() + 1}-${dateObj.getFullYear()}`;

const cowinApi = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${keys.districtId}&date=${date}`;
const bot = new TelegramBot(keys.botToken);

const fetchVaccinationSlotsInKolkata = () =>
  fetch(cowinApi, {
    agent: SocksProxyAgent(`socks4://${keys.proxyIp}:${keys.proxyPort}`),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
    },
  })
    .then((res) => {
      if (res.ok) {
        console.log("Pinged on", new Date());
        return res.json();
      } else {
        console.log("Failed ping.");
      }
    })
    .catch((e) => {
      console.log("Failed ping.");
    });

const availableSlotsMap: Map<number, AvailableSlot> = new Map();
const oldSlotsMap: Map<number, AvailableSlot> = new Map();

const getEmptyVaccinationSlots = async () => {
  setInterval(async () => {
    availableSlotsMap.clear();
    const vacSlots: CoWinRes = await fetchVaccinationSlotsInKolkata();
    vacSlots?.centers.forEach((center) => {
      center.sessions.forEach((s) => {
        if (s.available_capacity >= 8) {
          const { available_capacity, vaccine, date, min_age_limit } = s;
          const savedSlot = availableSlotsMap.get(center.center_id);
          if (savedSlot) {
            const sessions = savedSlot.sessions;
            sessions.push({
              available_capacity: available_capacity,
              vaccine: vaccine as any,
              date: date,
              min_age_limit: min_age_limit,
              fee: center.vaccine_fees?.find((f) => f.vaccine === vaccine).fee,
            });
            availableSlotsMap.set(center.center_id, { ...savedSlot, sessions });
          } else {
            availableSlotsMap.set(center.center_id, {
              centerName: center.name,
              address: center.address,
              pincode: center.pincode,
              fee_type: center.fee_type,
              sessions: [
                {
                  available_capacity: available_capacity,
                  vaccine: vaccine as any,
                  date: date,
                  min_age_limit: min_age_limit,
                  fee: center.vaccine_fees?.find((f) => f.vaccine === vaccine).fee,
                },
              ],
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
                os.available_capacity < s.available_capacity
              );
            }
          });
          if (newSessions.length) {
            oldSlotsMap.set(k, currSlot);
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
      availableSlotsMap.forEach((s) => {
        const message = `*Center Name*: ${s.centerName}\n*Address*: ${s.address} ${
          s.pincode
        }\n*Fee*: ${s.fee_type}\n${s.sessions
          .map(
            (ses) =>
              `\n*Date*: ${ses.date}\n*Vaccine*: ${ses.vaccine}${
                ses.fee ? `\n*Fees*: ₹${ses.fee}` : ""
              }\n*Number of vaccines available*: ${ses.available_capacity}\n*Age*: ${
                ses.min_age_limit
              }+\n`
          )
          .join("")}
            `;
        bot.sendMessage(keys.chatId, message, { parse_mode: "Markdown" });
      });
    }
  }, 4000);
};

getEmptyVaccinationSlots();

http
  .createServer(function (req, res) {
    if (req.url === "/") {
      console.log("Listening on port: ", keys.port || 8080);
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.write("Hello World!");
      res.end();
    }
  })
  .listen(keys.port || 8080);
