import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SlashCommandBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { IS_COMPONENTS_V2 } from "../v2/index.js";
import type { BotCommand } from "../index.js";

const BUTTON_NAMES = ["button_1", "button_2", "button_3", "button_4"] as const;

type ParsedButton = {
  label: string;
  url: string;
};

function parseButton(value: string, position: number): ParsedButton {
  const separatorIndex = value.indexOf("|");
  if (separatorIndex === -1) {
    throw new Error(`Button ${position} must use the format: Label | https://example.com`);
  }

  const label = value.slice(0, separatorIndex).trim();
  const url = value.slice(separatorIndex + 1).trim();
  if (!label || !url) {
    throw new Error(`Button ${position} must include both a label and a URL.`);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Button ${position} has an invalid URL.`);
  }

  if (!/^https?:$/.test(parsedUrl.protocol)) {
    throw new Error(`Button ${position} URL must use http:// or https://.`);
  }

  if (label.length > 80) {
    throw new Error(`Button ${position} label cannot exceed 80 characters.`);
  }

  return { label, url: parsedUrl.toString() };
}

export const embedCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create a Components V2 message in the current channel")
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Message title")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Message description")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("thumbnail")
        .setDescription("Optional thumbnail URL")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("button_1")
        .setDescription("Optional button: Label | https://example.com")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("button_2")
        .setDescription("Optional button: Label | https://example.com")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("button_3")
        .setDescription("Optional button: Label | https://example.com")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("button_4")
        .setDescription("Optional button: Label | https://example.com")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString("title", true).trim();
    const description = interaction.options.getString("description", true).trim();
    const thumbnail = interaction.options.getString("thumbnail")?.trim();

    if (!title || !description) {
      await interaction.reply({
        content: "Title and description cannot be empty.",
        ephemeral: true,
      });
      return;
    }

    let thumbnailUrl: string | undefined;
    if (thumbnail) {
      try {
        const parsedThumbnail = new URL(thumbnail);
        if (!/^https?:$/.test(parsedThumbnail.protocol)) throw new Error();
        thumbnailUrl = parsedThumbnail.toString();
      } catch {
        await interaction.reply({
          content: "The thumbnail must be a valid http:// or https:// URL.",
          ephemeral: true,
        });
        return;
      }
    }

    let buttons: ParsedButton[];
    try {
      buttons = BUTTON_NAMES.flatMap((name, index) => {
        const value = interaction.options.getString(name);
        return value ? [parseButton(value, index + 1)] : [];
      });
    } catch (error) {
      await interaction.reply({
        content: error instanceof Error ? error.message : "One of the buttons is invalid.",
        ephemeral: true,
      });
      return;
    }

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
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      );

    const components: ContainerBuilder[] | ActionRowBuilder<ButtonBuilder>[] = [container];
    if (buttons.length > 0) {
      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        buttons.map(({ label, url }) =>
          new ButtonBuilder().setLabel(label).setURL(url).setStyle(ButtonStyle.Link)
        )
      );
      components.push(buttonRow as never);
    }

    await interaction.reply({
      components,
      flags: IS_COMPONENTS_V2,
    } as never);
  },
};
