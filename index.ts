import * as TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";

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

const getEmptyVaccinationSlots = () => {
  setInterval(async () => {
    const vacSlots = await fetchVaccinationSlotsInKolkata();
    console.log(vacSlots[0]);
  }, 2000);
};

getEmptyVaccinationSlots();
