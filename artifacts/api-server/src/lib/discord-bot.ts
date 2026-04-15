import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
} from "discord.js";
import { db } from "@workspace/db";
import { sysUsersTable, codesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const GUILD_ID = "1489787998676713632";

const commands = [
  new SlashCommandBuilder()
    .setName("code")
    .setDescription("Créer un code ressource (réservé aux membres sys)")
    .addStringOption((opt) =>
      opt
        .setName("ressource")
        .setDescription("Type de ressource")
        .setRequired(true)
        .addChoices(
          { name: "Or (gold)", value: "gold" },
          { name: "Elixir", value: "elixir" },
          { name: "Diamants (diamonds)", value: "diamonds" }
        )
    )
    .addIntegerOption((opt) =>
      opt.setName("montant").setDescription("Montant de la ressource").setRequired(true).setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName("sys")
    .setDescription("Ajouter un membre à la liste sys")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName("membre").setDescription("Membre à ajouter à la sys").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("unsys")
    .setDescription("Retirer un membre de la liste sys")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName("membre").setDescription("Membre à retirer de la sys").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("syslist")
    .setDescription("Voir la liste des membres sys")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((cmd) => cmd.toJSON());

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function isSysUser(userId: string): Promise<boolean> {
  const [row] = await db.select().from(sysUsersTable).where(eq(sysUsersTable.userId, userId)).limit(1);
  return !!row;
}

async function handleCode(interaction: ChatInputCommandInteraction): Promise<void> {
  const userId = interaction.user.id;

  if (!(await isSysUser(userId))) {
    await interaction.reply({ content: "❌ Tu n'es pas dans la liste sys. Seuls les membres sys peuvent créer des codes.", ephemeral: true });
    return;
  }

  const resource = interaction.options.getString("ressource", true);
  const amount = interaction.options.getInteger("montant", true);

  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.select().from(codesTable).where(eq(codesTable.code, code)).limit(1);
    if (existing.length === 0) break;
    code = generateCode();
    attempts++;
  }

  await db.insert(codesTable).values({ code, resource, amount, createdBy: userId });

  await interaction.reply({
    content: `✅ Code créé avec succès !\n\n**Code :** \`${code}\`\n**Ressource :** ${resource}\n**Montant :** +${amount}\n\nEntre ce code dans Paname City pour recevoir ta récompense !`,
    ephemeral: true,
  });
}

async function handleSys(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser("membre", true);

  const existing = await db.select().from(sysUsersTable).where(eq(sysUsersTable.userId, target.id)).limit(1);
  if (existing.length > 0) {
    await interaction.reply({ content: `⚠️ ${target.username} est déjà dans la sys.`, ephemeral: true });
    return;
  }

  await db.insert(sysUsersTable).values({ userId: target.id, addedBy: interaction.user.id });
  await interaction.reply({ content: `✅ **${target.username}** a été ajouté à la sys.`, ephemeral: true });
}

async function handleUnsys(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser("membre", true);

  const existing = await db.select().from(sysUsersTable).where(eq(sysUsersTable.userId, target.id)).limit(1);
  if (existing.length === 0) {
    await interaction.reply({ content: `⚠️ ${target.username} n'est pas dans la sys.`, ephemeral: true });
    return;
  }

  await db.delete(sysUsersTable).where(eq(sysUsersTable.userId, target.id));
  await interaction.reply({ content: `✅ **${target.username}** a été retiré de la sys.`, ephemeral: true });
}

async function handleSyslist(interaction: ChatInputCommandInteraction): Promise<void> {
  const sysUsers = await db.select().from(sysUsersTable);

  if (sysUsers.length === 0) {
    await interaction.reply({ content: "📋 La liste sys est vide.", ephemeral: true });
    return;
  }

  const list = sysUsers.map((u) => `• <@${u.userId}>`).join("\n");
  await interaction.reply({ content: `📋 **Liste Sys (${sysUsers.length} membres) :**\n${list}`, ephemeral: true });
}

export async function startDiscordBot(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    logger.warn("DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID not set, bot won't start");
    return;
  }

  const rest = new REST().setToken(token);
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, GUILD_ID), { body: commands });
    logger.info("Discord slash commands registered");
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

  client.on("ready", () => {
    logger.info({ tag: client.user?.tag }, "Discord bot ready");
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
      switch (interaction.commandName) {
        case "code":
          await handleCode(interaction);
          break;
        case "sys":
          await handleSys(interaction);
          break;
        case "unsys":
          await handleUnsys(interaction);
          break;
        case "syslist":
          await handleSyslist(interaction);
          break;
      }
    } catch (err) {
      logger.error({ err, command: interaction.commandName }, "Error handling slash command");
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Une erreur est survenue.", ephemeral: true });
      }
    }
  });

  await client.login(token);
}
