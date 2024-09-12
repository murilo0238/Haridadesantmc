// discord.js
const { ChannelType } = require("discord.js");

// @discordjs/voice
const { joinVoiceChannel } = require('@discordjs/voice');

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("conectar")
        .setDescription("[🛠/💰] Me conecte em um canal de voz!")
        .addChannelOption(opChannel => opChannel
            .setName(`canal`)
            .setDescription(`Selecione um canal de voz`)
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
        )
        .setDMPermission(false),

    // execute (command)
    async execute(interaction, client) {

        // user without permission for dbPerms (wio.db)
        if (!dbPerms.has(interaction.user.id)) {
            await interaction.reply({
                content: `❌ | Você não tem permissão para usar este comando.`,
                ephemeral: true
            });
            return;
        };

        // channel selected
        const channelSelected = interaction.options.getChannel(`canal`);

        // try catch
        try {

            // connects the bot to a voice channel
            await joinVoiceChannel({
                channelId: channelSelected.id,
                guildId: channelSelected.guild.id,
                adapterCreator: channelSelected.guild.voiceAdapterCreator,
            });

            // message - success
            await interaction.reply({
                content: `✅ | BOT conectado com sucesso no canal de voz ${channelSelected}.`,
                ephemeral: true
            });

        } catch (err) {

            // message - error
            await interaction.reply({
                content: `❌ | Ocorreu um erro ao conectar o BOT no canal de voz ${channelSelected}.`,
                ephemeral: true
            });

        };

    },
};