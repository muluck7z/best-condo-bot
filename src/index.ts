import "dotenv/config";
import {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
  type ChatInputCommandInteraction,
  type Interaction,
} from "discord.js";
import { ticketCommand } from "./commands/ticket.js";
import { embedCommand } from "./commands/embed.js";
import { handleButton } from "./handlers/button.js";
import { handleSelectMenu } from "./handlers/selectMenu.js";

export type BotCommand = {
  data: { toJSON(): unknown };
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
};

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  throw new Error("Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID in the environment.");
}
const botToken = token;
const applicationId = clientId;

const commands: BotCommand[] = [ticketCommand, embedCommand];
const commandMap = new Collection<string, BotCommand>(commands.map((command) => [
  String((command.data.toJSON() as { name: string }).name),
  command,
]));
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(botToken);
  const route = guildId
    ? Routes.applicationGuildCommands(applicationId, guildId)
    : Routes.applicationCommands(applicationId);
  await rest.put(route, { body: commands.map((command) => command.data.toJSON()) });
}

async function handleInteraction(interaction: Interaction) {
  if (interaction.isChatInputCommand()) {
    const command = commandMap.get(interaction.commandName);
    if (command) await command.execute(interaction);
  } else if (interaction.isButton()) {
    await handleButton(interaction);
  } else if (interaction.isStringSelectMenu()) {
    await handleSelectMenu(interaction);
  }
}

client.once("ready", () => {
  console.log(`Bot connected as ${client.user?.tag ?? "unknown"}.`);
});
client.on("interactionCreate", (interaction) => {
  void handleInteraction(interaction).catch(async () => {
    const reply = { content: "Unable to process this interaction.", ephemeral: true };
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply(reply).catch(() => null);
    }
  });
});

await registerCommands();
await client.login(botToken);
