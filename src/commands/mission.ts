import type {
	ApplicationCommandData,
	ApplicationCommandOptionData,
	ApplicationCommandOptionChoiceData,
	AutocompleteFocusedOption,
	AutocompleteInteraction,
	CommandInteraction,
	Interaction,
} from "discord.js";
import type {Mission} from "../bindings.js";
import type Command from "../commands.js";
import {Util} from "discord.js";
import {challenges, levels, missions} from "../bindings.js";
import {nearest} from "../utils/string.js"
const dateTimeFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat("en-US", {
	dateStyle: "long",
	timeStyle: "short",
	timeZone: "UTC",
});
const dateFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat("en-US", {
	dateStyle: "long",
	timeZone: "UTC",
});
const timeFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat("en-US", {
	timeStyle: "short",
	timeZone: "UTC",
});
const dayTime: string = timeFormat.format(new Date(36000000));
const missionCommand: Command = {
	register(name: string): ApplicationCommandData {
		const description: string = "Tells you what is playable in the shop or when it is playable";
		const options: ApplicationCommandOptionData[] = [
			{
				type: "STRING",
				name: "mission",
				description: "Some mission",
				autocomplete: true,
			},
		];
		return {name, description, options};
	},
	async execute(interaction: Interaction): Promise<void> {
		if (interaction.isAutocomplete()) {
			const {options}: AutocompleteInteraction = interaction;
			const {name, value}: AutocompleteFocusedOption = options.getFocused(true);
			if (name !== "mission") {
				await interaction.respond([]);
				return;
			}
			const results: Mission[] = nearest<Mission>(value.toLowerCase(), missions, 7, (mission: Mission): string => {
				const name: string = `${challenges[mission.challenge].name} in ${levels[mission.level].name}`;
				return name.toLowerCase();
			});
			const suggestions: ApplicationCommandOptionChoiceData[] = results.map((mission: Mission): ApplicationCommandOptionChoiceData => {
				const name: string = `${challenges[mission.challenge].name} in ${levels[mission.level].name}`;
				return {
					name: name,
					value: name,
				};
			});
			await interaction.respond(suggestions);
			return;
		}
		if (!interaction.isCommand()) {
			return;
		}
		const {options}: CommandInteraction = interaction;
		const missionCount: number = missions.length;
		const now: number = Math.floor((interaction.createdTimestamp + 7200000) / 86400000);
		const search: string | null = options.getString("mission");
		if (search == null) {
		const schedules: string[] = [];
		for (let k: number = -1; k < 2; ++k) {
			const day: number = now + k;
			const seed: number = (day % missionCount + missionCount) % missionCount;
			const mission: Mission = missions[seed];
			const challenge: string = challenges[mission.challenge].name;
			const level: string = levels[mission.level].name;
			const dayDate: string = dateFormat.format(new Date(day * 86400000));
			schedules.push(`\u{2022} *${Util.escapeMarkdown(dayDate)}*: **${Util.escapeMarkdown(challenge)}** in **${Util.escapeMarkdown(level)}**`);
		}
		const scheduleList: string = schedules.join("\n");
		await interaction.reply(`Each mission starts at *${Util.escapeMarkdown(dayTime)}*:\n${scheduleList}`);
		return;
		}
		const results: Mission[] = nearest<Mission>(search.toLowerCase(), missions, 1, (mission: Mission): string => {
			const name: string = `${challenges[mission.challenge].name} in ${levels[mission.level].name}`;
			return name.toLowerCase();
		});
		if (results.length === 0) {
			await interaction.reply({
				content: `I do not know any mission with this name.`,
				ephemeral: true,
			});
			return;
		}
		const mission: Mission = results[0];
		const schedules: string[] = [];
		for (let k: number = -1; k < 2 || schedules.length < 2; ++k) {
			const day: number = now + k;
			const seed: number = (day % missionCount + missionCount) % missionCount;
			if (missions[seed] === mission) {
				const dayDateTime: string = dateTimeFormat.format(new Date(day * 86400000 + 36000000));
				schedules.push(`\u{2022} *${Util.escapeMarkdown(dayDateTime)}*`);
			}
		}
		const challenge: string = challenges[mission.challenge].name;
		const level: string = levels[mission.level].name;
		const scheduleList: string = schedules.join("\n");
		await interaction.reply(`**${Util.escapeMarkdown(challenge)}** in **${Util.escapeMarkdown(level)}** will be playable for 1 day starting:\n${scheduleList}`);
	},
	describe(interaction: CommandInteraction, name: string): string | null {
		return `Type \`/${name}\` to know what is playable in the shop\nType \`/${name} Some mission\` to know when \`Some mission\` is playable in the shop`;
	},
};
export default missionCommand;
