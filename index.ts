import TelegramBot from 'node-telegram-bot-api';
import SocksProxyAgent from 'socks-proxy-agent';
import fetch from 'node-fetch';
import http from 'http';
import { CoWinRes, AvailableSlot, keys, urls } from './config';

const dateObj = new Date();
const date = `${dateObj.getDate()}-${dateObj.getMonth() + 1}-${dateObj.getFullYear()}`;

const cowinApi = `${urls.cowinApi}${urls.calendarByDistrictRoute}?district_id=${keys.districtId}&date=${date}`;
const bot = new TelegramBot(keys.botToken);

const fetchVaccinationSlots = () =>
	fetch(cowinApi, {
		agent: keys.proxyIp ? SocksProxyAgent(`socks4://${keys.proxyIp}:${keys.proxyPort}`) : null,
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'
		}
	})
		.then(res => {
			if (res.ok) {
				console.log('\x1b[0mPinged on\x1b[0m\x1b[32m', new Date().toLocaleString(), '\x1b[32m');
				return res.json();
			} else {
				console.log('\x1b[31mFailed ping.\x1b[31m');
			}
		})
		.catch(e => {
			console.log('\x1b[31mFailed ping-----\x1b[31m', e);
		});

const availableSlotsMap: Map<number, AvailableSlot> = new Map();
const oldSlotsMap: Map<number, AvailableSlot> = new Map();

const notifyEmptyVaccinationSlots = async () => {
	const interval = Math.ceil(Math.random() * 7000 + 1000);
	setTimeout(async () => {
		availableSlotsMap.clear();
		const vacSlots: CoWinRes = await fetchVaccinationSlots();
		vacSlots?.centers.forEach(center => {
			center.sessions.forEach(s => {
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
							fee: center.vaccine_fees?.find(f => f.vaccine === vaccine).fee
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
									fee: center.vaccine_fees?.find(f => f.vaccine === vaccine).fee
								}
							]
						});
					}
				}
			});
		});
		if (availableSlotsMap.size) {
			availableSlotsMap.forEach((currSlot, k) => {
				const oldSlot = oldSlotsMap.get(k);
				if (oldSlot) {
					const newSessions = currSlot.sessions.filter(s => {
						for (const os of oldSlot.sessions) {
							return os.date === s.date && os.vaccine === s.vaccine && os.available_capacity < s.available_capacity;
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
			let flag = true;
			availableSlotsMap.forEach(s => {
				const message = `*Center Name*: ${s.centerName}\n*Address*: ${s.address} ${s.pincode}\n*Fee*: ${s.fee_type}\n${s.sessions
					.map(
						ses =>
							`\n*Date*: ${ses.date}\n*Vaccine*: ${ses.vaccine}${
								ses.fee ? `\n*Fees*: ₹${ses.fee}` : ''
							}\n*Number of vaccines available*: ${ses.available_capacity}\n*Age*: ${ses.min_age_limit}+`
					)
					.join('\n')}\n\n*Sign In*: ${urls.cowinSelfRegistration}
            `;
				if (keys.environment !== 'development' || flag) {
					bot.sendMessage(keys.chatId, message, { parse_mode: 'Markdown' });
					flag = false;
				}
			});
		}
		notifyEmptyVaccinationSlots();
	}, interval);
};

notifyEmptyVaccinationSlots();

http.createServer(function (req, res) {
	if (req.url === '/') {
		console.log('/home route hit on', new Date());
		res.writeHead(200, { 'Content-Type': 'text/plain' });
		res.write('Hello World!');
		res.end();
	}
}).listen(keys.port || 8080, null, () => {
	console.log('Listening on port:', keys.port || 8080);
});
