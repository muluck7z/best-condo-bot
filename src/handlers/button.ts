import {
  PermissionFlagsBits,
  type ButtonInteraction,
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
import { ticketStore } from "../ticketStore.js";

const STAFF_ROLE_IDS = [process.env.TICKET_SUPPORT_ROLE_ID, process.env.TICKET_EXTRA_ROLE_ID].filter(
  (id): id is string => Boolean(id)
);

function isTicketChannel(channel: TextChannel | null): channel is TextChannel {
  return Boolean(channel?.name.startsWith("ticket-"));
}

async function canManageTicket(interaction: ButtonInteraction) {
  const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
  return Boolean(
    member?.permissions.has(PermissionFlagsBits.ManageChannels) ||
      STAFF_ROLE_IDS.some((roleId) => member?.roles.cache.has(roleId))
  );
}

export async function handleButton(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith("ticket:")) return;
  const action = interaction.customId.split(":")[1];
  const channel = interaction.channel as TextChannel | null;

  if (!isTicketChannel(channel)) {
    await interaction.reply(v2EphemeralReply([errorContainer("This channel is not a ticket.")]));
    return;
  }

  if (action === "claim") {
    if (!(await canManageTicket(interaction))) {
      await interaction.reply(v2EphemeralReply([errorContainer("You do not have permission to claim tickets.")]));
      return;
    }
    const topic = channel.topic ?? "";
    if (topic.includes(":")) {
      await interaction.reply(v2EphemeralReply([errorContainer("This ticket has already been claimed by another staff member.")]));
      return;
    }
    await channel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      ManageMessages: true,
    });
    await channel.setTopic(`${topic}:${interaction.user.id}`);
    await interaction.reply(
      v2Reply([
        infoContainer({
          title: "Ticket Claimed",
          description: `${interaction.user} is now responsible for this ticket.`,
          avatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
        }),
      ])
    );
    return;
  }

  if (action === "cancel_user") {
    await interaction.reply(
      v2Reply(
        [
          infoContainer({
            title: "Cancel Ticket",
            description: "Are you sure you want to cancel this ticket?",
          }),
        ],
        {
          ephemeral: true,
          buttons: [row(dangerButton("ticket:confirm_cancel_user", "Yes, cancel"), secondaryButton("ticket:cancel_close", "Back"))],
        }
      )
    );
    return;
  }

  if (action === "cancel_close") {
    await interaction.reply(v2EphemeralReply([successContainer("Cancelled", "Ticket closure was cancelled.")]));
    return;
  }

  if (action === "confirm_cancel_user") {
    await interaction.reply(
      v2Reply([
        infoContainer({
          title: "Ticket Cancelled",
          description: "This ticket will be deleted in 5 seconds.",
        }),
      ])
    );
    setTimeout(() => {
      ticketStore.delete(channel.id);
      void channel.delete("Ticket cancelled by user").catch(() => null);
    }, 5_000);
    return;
  }

  if (action === "confirm_close") {
    if (!(await canManageTicket(interaction))) {
      await interaction.reply(v2EphemeralReply([errorContainer("Only staff members can close tickets.")]));
      return;
    }
    await interaction.reply(
      v2Reply([
        infoContainer({
          title: "Closing Ticket",
          description: "This ticket will be deleted in 30 seconds.",
        }),
      ])
    );
    setTimeout(() => {
      ticketStore.delete(channel.id);
      void channel.delete("Ticket closed by staff").catch(() => null);
    }, 30_000);
  }
}
