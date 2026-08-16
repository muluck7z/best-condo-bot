import {
  ChannelType,
  PermissionFlagsBits,
  type StringSelectMenuInteraction,
  type TextChannel,
} from "discord.js";
import {
  errorContainer,
  infoContainer,
  successContainer,
  dangerButton,
  secondaryButton,
  row,
  v2EphemeralReply,
  v2Reply,
} from "../v2/index.js";
import { ticketPanelConfig, ticketStore } from "../ticketStore.js";

const SUPPORT_ROLE_ID = process.env.TICKET_SUPPORT_ROLE_ID ?? "";
const EXTRA_ROLE_ID = process.env.TICKET_EXTRA_ROLE_ID ?? "";
const TICKET_EMOJI = "<:ticket:1508274275730063360>";
const TYPE_LABELS: Record<string, string> = {
  general_support: "General Support",
  questions: "Questions",
  report: "Report",
  billing: "Billing",
};

export async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  if (interaction.customId !== "ticket:type") return;
  const guild = interaction.guild;
  if (!guild) return;

  const type = interaction.values[0] ?? "general_support";
  const typeLabel = TYPE_LABELS[type] ?? type;
  await interaction.deferReply({ ephemeral: true });

  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18) || "user";
  const ticketName = `ticket-${safeName}`;
  const channels = await guild.channels.fetch();
  const existing = channels.find((channel) => channel?.name === ticketName);
  if (existing) {
    await interaction.editReply(v2EphemeralReply([errorContainer(`You already have an open ticket: ${existing}`)]));
    return;
  }

  let category = channels.find(
    (channel) => channel?.name.toLowerCase() === "tickets" && channel.type === ChannelType.GuildCategory
  );
  if (!category) {
    category = await guild.channels.create({
      name: "Tickets",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }],
    });
  }

  const roleOverwrites = [SUPPORT_ROLE_ID, EXTRA_ROLE_ID]
    .filter(Boolean)
    .map((id) => ({
      id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ManageMessages,
      ],
    }));

  const channel = await guild.channels.create({
    name: ticketName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: interaction.user.id,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ManageChannels,
        ],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      },
      ...roleOverwrites,
    ],
  });

  const thumbnailUrl = ticketPanelConfig.get(guild.id)?.thumbnailUrl;
  ticketStore.set(channel.id, {
    openerId: interaction.user.id,
    openerTag: interaction.user.tag,
    typeLabel,
    openedAt: new Date(),
    thumbnailUrl,
  });

  const buttons = row(
    secondaryButton("ticket:cancel_user", "Cancel"),
    dangerButton("ticket:confirm_close", "Close Ticket"),
    secondaryButton("ticket:claim", "Claim Ticket")
  );

  await (channel as TextChannel).send({
    content: `${interaction.user}${SUPPORT_ROLE_ID ? ` | <@&${SUPPORT_ROLE_ID}>` : ""}`,
    allowedMentions: {
      users: [interaction.user.id],
      roles: SUPPORT_ROLE_ID ? [SUPPORT_ROLE_ID] : [],
    },
  });
  await (channel as TextChannel).send({
    ...v2Reply(
      [
        infoContainer({
          title: `${TICKET_EMOJI} Ticket Opened — ${typeLabel}`,
          description: [
            `Hello, ${interaction.user}! Your ticket has been opened successfully.`,
            "",
            "Describe your issue or request in detail and wait for the team to respond.",
          ].join("\n"),
          avatarUrl: thumbnailUrl ?? interaction.user.displayAvatarURL({ size: 256 }),
        }),
      ],
      { buttons: [buttons] }
    ),
  });

  await interaction.editReply(v2EphemeralReply([successContainer("Ticket Opened!", `Your ticket was created in ${channel}`)]));
}
