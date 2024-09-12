// discord.js
const { EmbedBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const dbGifts = new JsonDatabase({ databasePath: "./databases/dbGifts.json" });
const dbProfiles = new JsonDatabase({ databasePath: "./databases/dbProfiles.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("resgatar-gift")
        .setDescription("[💰] Resgate um GiftCard!")
        .addStringOption(opString => opString
            .setName(`código`)
            .setDescription(`Código do GiftCard`)
            .setMaxLength(18)
            .setRequired(true)
        )
        .setDMPermission(false),

    // execute (command)
    async execute(interaction, client) {

        // code inserted - giftcard
        const codeInserted = interaction.options.getString(`código`);

        // checks if the giftcard exists in dbGifts (wio.db)
        if (!dbGifts.has(codeInserted)) {
            await interaction.reply({
                content: `❌ | O GiftCard inserido é inválido.`,
                ephemeral: true
            });
            return;
        };

        // variable with g information
        const giftBalance = await dbGifts.get(`${codeInserted}.balance`);

        // adds giftcard balance to user profile
        await dbProfiles.add(`${interaction.user.id}.balance`, Number(giftBalance));

        // delete the giftcard
        await dbGifts.delete(codeInserted);

        // variables with user profile information in dbProfiles
        const userBalance = await dbProfiles.get(`${interaction.user.id}.balance`) || 0;

        // embed - giftcard
        const embedGiftcard = new EmbedBuilder()
            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
            .setTitle(`${client.user.username} | Gift Resgatado`)
            .setDescription(`✅ | GiftCard resgatado com sucesso. Foram adicionados **R$__${Number(giftBalance).toFixed(2)}__** em sua conta, agora você está com **R$__${Number(userBalance).toFixed(2)}__** no total.`)
            .setColor(`Green`)
            .setTimestamp();

        // message - success
        await interaction.reply({
            embeds: [embedGiftcard],
            ephemeral: true
        });

        // log - giftcard redeemed
        const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
        if (channelLogsPriv) {
            await channelLogsPriv.send({
                embeds: [new EmbedBuilder()
                    .setAuthor({ name: `${interaction.user.username} - ${interaction.user.id}`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                    .setTitle(`${client.user.username} | Gift Resgatado`)
                    .setDescription(`🎁 | O ${interaction.user} acaba de resgatar um gift no valor de **R$__${Number(giftBalance).toFixed(2)}__** e agora ele está com **R$__${Number(userBalance).toFixed(2)}__** no total.`)
                    .setThumbnail(interaction.user.avatarURL({ dynamic: true }))
                    .setColor(`Green`)
                    .setTimestamp()
                ]
            });
        };

    },
};