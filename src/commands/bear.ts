import type {
	ApplicationCommandData,
	ApplicationCommandOptionChoiceData,
	ApplicationCommandOptionData,
	AutocompleteFocusedOption,
	AutocompleteInteraction,
	CommandInteraction,
	Interaction,
} from "discord.js";
import type {Bear, Level, Outfit} from "../bindings.js";
import type Command from "../commands.js";
import type {Bear as BearCompilation} from "../compilations.js";
import type {Bear as BearDefinition} from "../definitions.js";
import type {Bear as BearDependency} from "../dependencies.js";
import type {Locale, Localized} from "../utils/string.js";
import {Util} from "discord.js";
import {bears, levels, outfits} from "../bindings.js";
import {bear as bearCompilation} from "../compilations.js";
import {bear as bearDefinition} from "../definitions.js";
import {composeAll, localize, nearest, resolve} from "../utils/string.js";
type HelpGroups = BearDependency["help"];
type BossGoalGroups = BearDependency["bossGoal"];
type CoinsGoalGroups = BearDependency["coinsGoal"];
type TimeGoalGroups = BearDependency["timeGoal"];
const {
	commandName,
	commandDescription,
	bearOptionName,
	bearOptionDescription,
}: BearDefinition = bearDefinition;
const {
	help: helpLocalizations,
	reply: replyLocalizations,
	noOutfit: noOutfitLocalizations,
	bossGoal: bossGoalLocalizations,
	coinsWithBossGoal: coinsWithBossGoalLocalizations,
	coinsWithoutBossGoal: coinsWithoutBossGoalLocalizations,
	timeWithBossOrCoinsGoal: timeWithBossOrCoinsGoalLocalizations,
	timeWithoutBossAndCoinsGoal: timeWithoutBossAndCoinsGoalLocalizations,
	noGoal: noGoalLocalizations,
}: BearCompilation = bearCompilation;
const bearCommand: Command = {
	register(): ApplicationCommandData {
		return {
			name: commandName,
			description: commandDescription["en-US"],
			descriptionLocalizations: commandDescription,
			options: [
				((): ApplicationCommandOptionData & {minValue: number, maxValue: number} => ({
					type: "INTEGER",
					name: bearOptionName,
					description: bearOptionDescription["en-US"],
					descriptionLocalizations: bearOptionDescription,
					required: true,
					minValue: 0,
					maxValue: bears.length - 1,
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
			if (name !== bearOptionName) {
				await interaction.respond([]);
				return;
			}
			const results: Bear[] = nearest<Bear>(value.toLowerCase(), bears, 7, (bear: Bear): string => {
				const {name}: Bear = bear;
				const bearName: string = name[resolvedLocale];
				return bearName.toLowerCase();
			});
			const suggestions: ApplicationCommandOptionChoiceData[] = results.map<ApplicationCommandOptionChoiceData>((bear: Bear): ApplicationCommandOptionChoiceData => {
				const {id, name}: Bear = bear;
				const bearName: string = name[resolvedLocale];
				return {
					name: bearName,
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
		const id: number = options.getInteger(bearOptionName, true);
		const bear: Bear = bears[id];
		const {gold, name}: Bear = bear;
		const level: Level = levels[bear.level];
		const bearOutfits: Outfit[] = bear.outfits.filter((outfit: number): boolean => {
			const {name}: Outfit = outfits[outfit];
			return name["en-US"] !== "Default";
		}).map<Outfit>((outfit: number): Outfit => {
			return outfits[outfit];
		});
		const boss: Localized<string> | null = bear.id % 8 === 0 ? levels[bear.level].boss : null;
		const coins: number | null = bear.id % 8 === 3 ? levels[bear.level].coins - 25 : 0;
		const bossGoal: Localized<(groups: {}) => string> | null = boss != null ? composeAll<BossGoalGroups, {}>(bossGoalLocalizations, localize<BossGoalGroups>((locale: Locale): BossGoalGroups => {
			return {
				boss: (): string => {
					return Util.escapeMarkdown(boss[locale]);
				},
			};
		})) : null;
		const coinsGoal: Localized<(groups: {}) => string> | null = coins !== 0 ? composeAll<CoinsGoalGroups, {}>(bossGoal != null ? coinsWithBossGoalLocalizations : coinsWithoutBossGoalLocalizations, localize<CoinsGoalGroups>((): CoinsGoalGroups => {
			return {
				coins: (): string => {
					return Util.escapeMarkdown(`${coins}`);
				},
			};
		})) : null;
		const minutes: string = `${gold / 60 | 0}`.padStart(2, "0");
		const seconds: string = `${gold % 60 | 0}`.padStart(2, "0");
		const centiseconds: string = `${gold * 100 % 100 | 0}`.padStart(2, "0");
		const time: string = `${minutes}:${seconds}.${centiseconds}`;
		const timeGoal: Localized<(groups: {}) => string> | null = time !== "00:00.00" ? composeAll<TimeGoalGroups, {}>(bossGoal != null || coinsGoal != null ? timeWithBossOrCoinsGoalLocalizations : timeWithoutBossAndCoinsGoalLocalizations, localize<TimeGoalGroups>((): TimeGoalGroups => {
			return {
				time: (): string => {
					return Util.escapeMarkdown(time);
				},
			};
		})) : null;
		const goals: Localized<(groups: {}) => string>[] = [bossGoal, coinsGoal, timeGoal].filter((goal: Localized<(groups: {}) => string> | null): goal is Localized<(groups: {}) => string> => {
			return goal != null;
		});
		await interaction.reply({
			content: replyLocalizations["en-US"]({
				name: (): string => {
					return Util.escapeMarkdown(name["en-US"]);
				},
				level: (): string => {
					return Util.escapeMarkdown(level.name["en-US"]);
				},
				outfitNameConjunction: (): string => {
					if (bearOutfits.length !== 0) {
						const conjunctionFormat: Intl.ListFormat = new Intl.ListFormat("en-US", {
							style: "long",
							type: "conjunction",
						});
						return conjunctionFormat.format(bearOutfits.map<string>((outfit: Outfit): string => {
							return `*${Util.escapeMarkdown(outfit.name["en-US"])}*`;
						}));
					}
					return Util.escapeMarkdown(noOutfitLocalizations["en-US"]({}));
				},
				goalConjunction: (): string => {
					if (goals.length !== 0) {
						const conjunctionFormat: Intl.ListFormat = new Intl.ListFormat("en-US", {
							style: "long",
							type: "conjunction",
						});
						return conjunctionFormat.format(goals.map<string>((goal: Localized<(groups: {}) => string>): string => {
							return goal["en-US"]({});
						}));
					}
					return Util.escapeMarkdown(noGoalLocalizations["en-US"]({}));
				},
			}),
		});
		if (resolvedLocale === "en-US") {
			return;
		}
		await interaction.followUp({
			content: replyLocalizations[resolvedLocale]({
				name: (): string => {
					return Util.escapeMarkdown(name[resolvedLocale]);
				},
				level: (): string => {
					return Util.escapeMarkdown(level.name[resolvedLocale]);
				},
				outfitNameConjunction: (): string => {
					if (bearOutfits.length !== 0) {
						const conjunctionFormat: Intl.ListFormat = new Intl.ListFormat(resolvedLocale, {
							style: "long",
							type: "conjunction",
						});
						return conjunctionFormat.format(bearOutfits.map<string>((outfit: Outfit): string => {
							return `*${Util.escapeMarkdown(outfit.name[resolvedLocale])}*`;
						}));
					}
					return Util.escapeMarkdown(noOutfitLocalizations[resolvedLocale]({}));
				},
				goalConjunction: (): string => {
					if (goals.length !== 0) {
						const conjunctionFormat: Intl.ListFormat = new Intl.ListFormat(resolvedLocale, {
							style: "long",
							type: "conjunction",
						});
						return conjunctionFormat.format(goals.map<string>((goal: Localized<(groups: {}) => string>): string => {
							return goal[resolvedLocale]({});
						}));
					}
					return Util.escapeMarkdown(noGoalLocalizations[resolvedLocale]({}));
				},
			}),
			ephemeral: true,
		});
	},
	describe(interaction: CommandInteraction): Localized<(groups: {}) => string> | null {
		return composeAll<HelpGroups, {}>(helpLocalizations, localize<HelpGroups>((locale: Locale): HelpGroups => {
			return {
				commandName: (): string => {
					return commandName;
				},
				bearOptionDescription: (): string => {
					return bearOptionDescription[locale];
				},
			};
		}));
	},
};
export default bearCommand;
