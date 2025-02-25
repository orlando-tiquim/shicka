type HelpGroups = {
	commandName: () => string,
};
type ReplyGroups = {
	bot: () => string,
	author: () => string,
	link: () => string,
};
type AboutDependency = {
	help: HelpGroups,
	reply: ReplyGroups,
};
export default AboutDependency;
