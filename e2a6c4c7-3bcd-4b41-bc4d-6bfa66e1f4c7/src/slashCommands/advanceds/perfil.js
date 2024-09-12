// discord.js
const { EmbedBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// moment - locale
const moment = require("moment");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbProfiles = new JsonDatabase({ databasePath: "./databases/dbProfiles.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("perfil")
        .setDescription("[💰] Veja o perfil de compras de algum usuário!")
        .addUserOption(opUser => opUser
            .setName(`usuário`)
            .setDescription(`Selecione um usuário`)
            .setRequired(false)
        )
        .setDMPermission(false),

    // execute (command)
    async execute(interaction, client) {

        // user selected
        const userSelected = interaction.options.getUser(`usuário`) || interaction.user;

        // variables with user profile information
        const userOrdersTotal = await dbProfiles.get(`${userSelected.id}.ordersTotal`) || 0;
        const userPaidsTotal = await dbProfiles.get(`${userSelected.id}.paidsTotal`) || 0;
        const userBalance = await dbProfiles.get(`${userSelected.id}.balance`) || 0;
        const userLastPurchase = await dbProfiles.get(`${userSelected.id}.lastPurchase`);

        // checks if the total spent exists
        let userRanking = 0;
        if (userPaidsTotal != 0) {

            // takes all total expenses from profiles in dbProfiles and
            // checks them with the user profile
            const userFindId = dbProfiles.all().find((user) => user.ID == userSelected.id);
            const userPosition = dbProfiles.all()
                .filter((profile) => profile.data.paidsTotal > userFindId.data.paidsTotal).length + 1;

            // changes the value of the variable
            userRanking = userPosition

        };

        // embed - profile
        const embedProfile = new EmbedBuilder()
            .setAuthor({ name: userSelected.username, iconURL: userSelected.avatarURL({ dynamic: true }) })
            .setTitle(`Perfil | ${userSelected.username}`)
            .addFields(
                { name: `🛒 | Produtos Comprados:`, value: `**__${Number(userOrdersTotal)}__** Compras realizadas.` },
                { name: `💸 | Total Gasto:`, value: `**R$__${Number(userPaidsTotal).toFixed(2)}__** ` },
                { name: `💰 | Saldo:`, value: `**R$__${Number(userBalance).toFixed(2)}__**` },
                { name: `🏆 | Posição no Rank:`, value: `${userRanking != 0 ? `**${userSelected.username}** está em **__${userRanking}°__** no ranking!` : `**${userSelected.username}** não está no ranking!`}` },
                { name: `📝 | Ultima Compra:`, value: `${userLastPurchase ? `<t:${Math.floor(moment(userLastPurchase).toDate().getTime() / 1000)}:R>` : `**__Nenhuma!__**`}` }
            )
            .setThumbnail(userSelected.avatarURL({ dynamic: true }))
            .setColor(`NotQuiteBlack`)
            .setTimestamp();

        // message - profile
        await interaction.reply({
            embeds: [embedProfile]
        });

    },
};