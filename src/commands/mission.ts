import type {
	ApplicationCommandData,
	ApplicationCommandOptionChoiceData,
	ApplicationCommandOptionData,
	AutocompleteFocusedOption,
	AutocompleteInteraction,
	CommandInteraction,
	Interaction,
} from "discord.js";
import type {Challenge, Level, Mission} from "../bindings.js";
import type Command from "../commands.js";
import type {Locale, Localized} from "../utils/string.js";
import {Util} from "discord.js";
import {challenges, levels, missions} from "../bindings.js";
import {compileAll, composeAll, list, localize, nearest, resolve} from "../utils/string.js";
type HelpGroups = {
	commandName: () => string,
	missionOptionDescription: () => string,
};
type ReplyGroups = {
	challengeName: () => string,
	levelName: () => string,
	scheduleList: () => string,
};
type BareReplyGroups = {
	dayTime: () => string,
	scheduleList: () => string,
};
type MissionNameGroups = {
	challengeName: () => string,
	levelName: () => string,
};
type ScheduleGroups = {
	dayDateTime: () => string,
};
type BareScheduleGroups = {
	dayDate: () => string,
	challengeName: () => string,
	levelName: () => string,
};
const commandName: string = "mission";
const commandDescriptionLocalizations: Localized<string> = {
	"en-US": "Tells you what is playable in the shop or when it is playable",
	"fr": "Te dit ce qui est jouable dans la boutique ou quand c'est jouable",
};
const commandDescription: string = commandDescriptionLocalizations["en-US"];
const missionOptionName: string = "mission";
const missionOptionDescriptionLocalizations: Localized<string> = {
	"en-US": "Some mission",
	"fr": "Une mission",
};
const missionOptionDescription: string = missionOptionDescriptionLocalizations["en-US"];
const dayTime: Date = new Date(36000000);
const helpLocalizations: Localized<(groups: HelpGroups) => string> = compileAll<HelpGroups>({
	"en-US": "Type `/$<commandName>` to know what is playable in the shop\nType `/$<commandName> $<missionOptionDescription>` to know when `$<missionOptionDescription>` is playable in the shop",
	"fr": "Tape `/$<commandName>` pour savoir ce qui est jouable dans la boutique\nTape `/$<commandName> $<missionOptionDescription>` pour savoir quand `$<missionOptionDescription>` est jouable dans la boutique",
});
const replyLocalizations: Localized<(groups: ReplyGroups) => string> = compileAll<ReplyGroups>({
	"en-US": "**$<challengeName>** in **$<levelName>** will be playable for 1 day starting:\n$<scheduleList>",
	"fr": "**$<challengeName>** dans **$<levelName>** sera jouable durant 1 jour à partir de :\n$<scheduleList>",
});
const bareReplyLocalizations: Localized<(groups: BareReplyGroups) => string> = compileAll<BareReplyGroups>({
	"en-US": "Each mission starts at *$<dayTime>*:\n$<scheduleList>",
	"fr": "Chaque mission commence à *$<dayTime>* :\n$<scheduleList>",
});
const missionNameLocalizations: Localized<((groups: MissionNameGroups) => string)> = compileAll<MissionNameGroups>({
	"en-US": "$<challengeName> in $<levelName>",
	"fr": "$<challengeName> dans $<levelName>",
});
const scheduleLocalizations: Localized<((groups: ScheduleGroups) => string)> = compileAll<ScheduleGroups>({
	"en-US": "*$<dayDateTime>*",
	"fr": "*$<dayDateTime>*",
});
const bareScheduleLocalizations: Localized<((groups: BareScheduleGroups) => string)> = compileAll<BareScheduleGroups>({
	"en-US": "*$<dayDate>*: **$<challengeName>** in **$<levelName>**",
	"fr": "*$<dayDate>* : **$<challengeName>** dans **$<levelName>**",
});
const missionCommand: Command = {
	register(): ApplicationCommandData {
		return {
			name: commandName,
			description: commandDescription,
			descriptionLocalizations: commandDescriptionLocalizations,
			options: [
				((): ApplicationCommandOptionData & {minValue: number, maxValue: number} => ({
					type: "INTEGER",
					name: missionOptionName,
					description: missionOptionDescription,
					descriptionLocalizations: missionOptionDescriptionLocalizations,
					minValue: 0,
					maxValue: missions.length - 1,
					autocomplete: true,
				}))(),
			],
		};
	},
	async execute(interaction: Interaction): Promise<void> {
		if (interaction.isAutocomplete()) {
			const {locale, options}: AutocompleteInteraction = interaction;
			const resolvedLocale: Locale = resolve(locale);
			const {name, value}: AutocompleteFocusedOption = options.getFocused(true);
			if (name !== missionOptionName) {
				await interaction.respond([]);
				return;
			}
			const results: Mission[] = nearest<Mission>(value.toLowerCase(), missions, 7, (mission: Mission): string => {
				const challenge: Challenge = challenges[mission.challenge];
				const level: Level = levels[mission.level];
				const missionName: string = missionNameLocalizations[resolvedLocale]({
					challengeName: (): string => {
						return challenge.name[resolvedLocale];
					},
					levelName: (): string => {
						return level.name[resolvedLocale];
					},
				});
				return missionName.toLowerCase();
			});
			const suggestions: ApplicationCommandOptionChoiceData[] = results.map<ApplicationCommandOptionChoiceData>((mission: Mission): ApplicationCommandOptionChoiceData => {
				const {id}: Mission = mission;
				const challenge: Challenge = challenges[mission.challenge];
				const level: Level = levels[mission.level];
				const missionName: string = missionNameLocalizations[resolvedLocale]({
					challengeName: (): string => {
						return challenge.name[resolvedLocale];
					},
					levelName: (): string => {
						return level.name[resolvedLocale];
					},
				});
				return {
					name: missionName,
					value: id,
				};
			});
			await interaction.respond(suggestions);
			return;
		}
		if (!interaction.isCommand()) {
			return;
		}
		const {locale, options}: CommandInteraction = interaction;
		const resolvedLocale: Locale = resolve(locale);
		const missionCount: number = missions.length;
		const now: number = Math.floor((interaction.createdTimestamp + 7200000) / 86400000);
		const id: number | null = options.getInteger(missionOptionName);
		if (id == null) {
		const schedules: Localized<(groups: {}) => string>[] = [];
		for (let k: number = -1; k < 2; ++k) {
			const day: number = now + k;
			const seed: number = (day % missionCount + missionCount) % missionCount;
			const mission: Mission = missions[seed];
			const challenge: Challenge = challenges[mission.challenge];
			const level: Level = levels[mission.level];
			const dayDate: Date = new Date(day * 86400000);
			const schedule: Localized<(groups: {}) => string> = composeAll<BareScheduleGroups, {}>(bareScheduleLocalizations, localize<BareScheduleGroups>((locale: keyof Localized<unknown>): BareScheduleGroups => {
				return {
					dayDate: (): string => {
						const dateFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat(locale, {
							dateStyle: "long",
							timeZone: "UTC",
						});
						return Util.escapeMarkdown(dateFormat.format(dayDate));
					},
					challengeName: (): string => {
						return Util.escapeMarkdown(challenge.name[locale]);
					},
					levelName: (): string => {
						return Util.escapeMarkdown(level.name[locale]);
					},
				};
			}));
			schedules.push(schedule);
		}
		await interaction.reply({
			content: bareReplyLocalizations["en-US"]({
				dayTime: (): string => {
					const timeFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat("en-US", {
						timeStyle: "short",
						timeZone: "UTC",
					});
					return Util.escapeMarkdown(timeFormat.format(dayTime));
				},
				scheduleList: (): string => {
					return list(schedules.map<string>((schedule: Localized<(groups: {}) => string>): string => {
						return schedule["en-US"]({})
					}));
				},
			}),
		});
		if (resolvedLocale === "en-US") {
			return;
		}
		await interaction.followUp({
			content: bareReplyLocalizations[resolvedLocale]({
				dayTime: (): string => {
					const timeFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat(resolvedLocale, {
						timeStyle: "short",
						timeZone: "UTC",
					});
					return Util.escapeMarkdown(timeFormat.format(dayTime));
				},
				scheduleList: (): string => {
					return list(schedules.map<string>((schedule: Localized<(groups: {}) => string>): string => {
						return schedule[resolvedLocale]({})
					}));
				},
			}),
			ephemeral: true,
		});
		return;
		}
		const mission: Mission = missions[id];
		const schedules: Localized<(groups: {}) => string>[] = [];
		for (let k: number = -1; k < 2 || schedules.length < 2; ++k) {
			const day: number = now + k;
			const seed: number = (day % missionCount + missionCount) % missionCount;
			if (missions[seed] === mission) {
				const dayDateTime: Date = new Date(day * 86400000 + 36000000);
				const schedule: Localized<(groups: {}) => string> = composeAll<ScheduleGroups, {}>(scheduleLocalizations, localize<ScheduleGroups>((locale: keyof Localized<unknown>): ScheduleGroups => {
					return {
						dayDateTime: (): string => {
							const dateTimeFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat(locale, {
								dateStyle: "long",
								timeStyle: "short",
								timeZone: "UTC",
							});
							return Util.escapeMarkdown(dateTimeFormat.format(dayDateTime));
						},
					};
				}));
				schedules.push(schedule);
			}
		}
		const challenge: Challenge = challenges[mission.challenge];
		const level: Level = levels[mission.level];
		await interaction.reply({
			content: replyLocalizations["en-US"]({
				challengeName: (): string => {
					return Util.escapeMarkdown(challenge.name["en-US"]);
				},
				levelName: (): string => {
					return Util.escapeMarkdown(level.name["en-US"]);
				},
				scheduleList: (): string => {
					return list(schedules.map<string>((schedule: Localized<(groups: {}) => string>): string => {
						return schedule["en-US"]({})
					}));
				},
			}),
		});
		if (resolvedLocale === "en-US") {
			return;
		}
		await interaction.followUp({
			content: replyLocalizations[resolvedLocale]({
				challengeName: (): string => {
					return Util.escapeMarkdown(challenge.name[resolvedLocale]);
				},
				levelName: (): string => {
					return Util.escapeMarkdown(level.name[resolvedLocale]);
				},
				scheduleList: (): string => {
					return list(schedules.map<string>((schedule: Localized<(groups: {}) => string>): string => {
						return schedule[resolvedLocale]({})
					}));
				},
			}),
			ephemeral: true,
		});
	},
	describe(interaction: CommandInteraction): Localized<(groups: {}) => string> | null {
		return composeAll<HelpGroups, {}>(helpLocalizations, localize<HelpGroups>((locale: keyof Localized<unknown>): HelpGroups => {
			return {
				commandName: (): string => {
					return commandName;
				},
				missionOptionDescription: (): string => {
					return missionOptionDescriptionLocalizations[locale];
				},
			};
		}));
	},
};
export default missionCommand;
