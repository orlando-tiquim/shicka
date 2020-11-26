import discord from "discord.js";
import Command from "../command.js";
import {xorShift32} from "../random.js";
const {Util} = discord;
const channels = new Set(["bot", "moderation"]);
const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
	dateStyle: "long",
	timeStyle: "short",
	timeZone: "UTC",
});
const listFormat = new Intl.ListFormat("en-US", {
	style: "long",
	type: "conjunction",
});
function shuffle(generator, items) {
	for (let i = items.length - 1; i > 0; --i) {
		const j = Number(generator.next().value * BigInt(i + 1) >> 32n);
		[items[i], items[j]] = [items[j], items[i]];
	}
}
function sliceItems(generator, items, itemsPerSlice, slicesPerRarity) {
	items = items.slice();
	const slices = [];
	const stash = new Set();
	const itemsPerShuffle = items.length;
	const slicesPerShuffle = Math.floor(itemsPerShuffle / itemsPerSlice);
	const remainingItemsCount = itemsPerShuffle % itemsPerSlice;
	for (let i = 0; i < slicesPerRarity; i += slicesPerShuffle) {
		shuffle(generator, items);
		const overflow = [];
		const remainingSlicesCount = Math.min(slicesPerRarity - i, slicesPerShuffle);
		let j = 0;
		for (let k = 0; k < remainingSlicesCount - 1; ++k) {
			while (overflow.length < remainingItemsCount && !stash.has(items[j])) {
				overflow.push(items[j++]);
			}
			const slice = [];
			for (let l = 0; l < itemsPerSlice; ++l) {
				const item = items[j++];
				slice.push(item)
				stash.delete(item);
			}
			slices.push(slice);
		}
		const slice = [...stash.keys()];
		while (slice.length < itemsPerSlice) {
			const item = items[j++];
			if (!stash.has(item)) {
				slice.push(item);
			}
		}
		stash.clear();
		slices.push(slice);
		for (const item of overflow) {
			stash.add(item);
		}
	}
	shuffle(generator, slices);
	return slices;
}
export default class ShopCommand extends Command {
	async execute(message, parameters) {
		if (!channels.has(message.channel.name)) {
			return;
		}
		const {salt, itemsByRarity} = message.client;
		const slicesByRarityBySeed = new Map();
		const count = Math.ceil(Math.max(
			itemsByRarity.common.length / 4,
			itemsByRarity.rare.length / 2,
			itemsByRarity.epic.length,
			itemsByRarity.tristopio.length,
		));
		const now = Math.floor(Date.now() / 21600000);
		const sample = [];
		for (let k = -2; k < 4; ++k) {
			const date = now + k;
			const seed = Math.floor(date / count);
			if (!slicesByRarityBySeed.has(seed)) {
				const generator = xorShift32(BigInt(seed) + BigInt(salt));
				const slicesByRarity = {
					common: sliceItems(generator, itemsByRarity.common, 4, count),
					rare: sliceItems(generator, itemsByRarity.rare, 2, count),
					epic: sliceItems(generator, itemsByRarity.epic, 1, count),
					tristopio: sliceItems(generator, itemsByRarity.tristopio, 1, count),
				};
				slicesByRarityBySeed.set(seed, slicesByRarity);
			}
			const slicesByRarity = slicesByRarityBySeed.get(seed);
			const index = date - seed * count;
			const items = [
				slicesByRarity.common[index][0],
				slicesByRarity.common[index][1],
				slicesByRarity.common[index][2],
				slicesByRarity.common[index][3],
				slicesByRarity.rare[index][0],
				slicesByRarity.rare[index][1],
				slicesByRarity.epic[index][0],
				slicesByRarity.tristopio[index][0],
			];
			const names = items.map((item) => {
				return `**${Util.escapeMarkdown(item.name)}**`;
			});
			const dateTime = dateTimeFormat.format(new Date(date * 21600000));
			const list = listFormat.format(names);
			sample.push(`*${Util.escapeMarkdown(dateTime)}* (local time): ${list}`);
		}
		const schedule = sample.join("\n");
		await message.channel.send(schedule);
	}
	async describe(message, command) {
		if (!channels.has(message.channel.name)) {
			return "";
		}
		return `Type \`${command}\` to know what is for sale in the shop`;
	}
}
