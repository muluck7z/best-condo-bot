import {
  ActionRowBuilder,
  ContainerBuilder,
  PermissionFlagsBits,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import {
  errorContainer,
  IS_COMPONENTS_V2,
  successContainer,
  v2EphemeralReply,
  v2Reply,
} from "../v2/index.js";
import { ticketPanelConfig } from "../ticketStore.js";
import type { BotCommand } from "../index.js";

const TICKET_EMOJI = "<:ticket:1508274275730063360>";
const TICKET_TYPES = [
  { label: "General Support", value: "general_support", description: "General issues or support requests" },
  { label: "Questions", value: "questions", description: "Ask our team your questions" },
  { label: "Report", value: "report", description: "Report a user or situation" },
  { label: "Billing", value: "billing", description: "Payment-related questions" },
];

export const ticketCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ticket system")
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Sends the ticket opening panel in the current channel")
        .addStringOption((opt) => opt.setName("title").setDescription("Panel title").setRequired(false))
        .addStringOption((opt) =>
          opt.setName("thumbnail").setDescription("Thumbnail image URL for the panel").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Adds a user to the ticket")
        .addUserOption((opt) => opt.setName("user").setDescription("User to add").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Removes a user from the ticket")
        .addUserOption((opt) => opt.setName("user").setDescription("User to remove").setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const sub = interaction.options.getSubcommand();
    if (sub === "panel") {
      const title = interaction.options.getString("title") ?? `${TICKET_EMOJI} Support Center`;
      const thumbnailRaw = interaction.options.getString("thumbnail");
      let thumbnailUrl: string | undefined;

      if (thumbnailRaw) {
        try {
          new URL(thumbnailRaw);
          thumbnailUrl = thumbnailRaw;
        } catch {
          await interaction.reply(v2EphemeralReply([errorContainer("The thumbnail URL is invalid.")]));
          return;
        }
      }

      ticketPanelConfig.set(guild.id, { thumbnailUrl });
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("ticket:type")
        .setPlaceholder("Select the support type...")
        .addOptions(
          TICKET_TYPES.map((type) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(type.label)
              .setValue(type.value)
              .setDescription(type.description)
          )
        );
      const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
      const description = [
        "After requesting support, please wait for a team member to respond.",
        "Support is handled privately, and only the team will have access to the channel.",
        "",
        "Click below to continue:",
      ].join("\n");
      const container = new ContainerBuilder();

      if (thumbnailUrl) {
        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${title}`))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl))
        );
      } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${title}`));
      }

      container
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(menuRow)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("-# Select an option to open your ticket"));

      await interaction.reply({ components: [container], flags: IS_COMPONENTS_V2 } as never);
      return;
    }

    const channel = interaction.channel as TextChannel | null;
    if (!channel?.name.startsWith("ticket-")) {
      await interaction.reply(v2EphemeralReply([errorContainer("This channel is not a ticket.")]));
      return;
    }

    const user = interaction.options.getUser("user", true);
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply(v2EphemeralReply([errorContainer("User was not found on the server.")]));
      return;
    }

    if (sub === "add") {
      await channel.permissionOverwrites.edit(member, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
      await interaction.reply(v2Reply([successContainer("User Added", `${user} was added to the ticket.`)]));
    } else if (sub === "remove") {
      await channel.permissionOverwrites.edit(member, { ViewChannel: false });
      await interaction.reply(v2Reply([successContainer("User Removed", `${user} was removed from the ticket.`)]));
    }
  },
};
