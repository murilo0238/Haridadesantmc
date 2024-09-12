// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// moment - date and time
const moment = require("moment");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbSales = new JsonDatabase({ databasePath: "./databases/dbSales.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("estatisticas")
        .setDescription("[🛠/💰] Veja as estatisticas do BOT!")
        .setDMPermission(false),

    // execute - command
    async execute(interaction, client) {

        // user without permission for dbPerms (wio.db)
        if (!dbPerms.has(interaction.user.id)) {
            await interaction.reply({
                content: `❌ | Você não tem permissão para usar este comando.`,
                ephemeral: true
            });
            return;
        };

        // row init
        const rowInit = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`currentDay`).setLabel(`Hoje`).setEmoji(`🗓`).setStyle(`Secondary`),
                new ButtonBuilder().setCustomId(`last7Days`).setLabel(`Últimos 7 Dias`).setEmoji(`🗓`).setStyle(`Secondary`),
                new ButtonBuilder().setCustomId(`last30Days`).setLabel(`Últimos 30 Dias`).setEmoji(`🗓`).setStyle(`Secondary`),
                new ButtonBuilder().setCustomId(`allPeriod`).setLabel(`Todo Periodo`).setEmoji(`🗓`).setStyle(`Secondary`),
            );

        // embed init
        const embedInit = new EmbedBuilder()
            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
            .setTitle(`${client.user.username} | Estatísticas`)
            .setDescription(`📝 | Para ver suas estatísticas, selecione a data usando os botões abaixo!`)
            .setColor(`NotQuiteBlack`)
            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

        // reply - init
        await interaction.reply({
            embeds: [embedInit],
            components: [rowInit]
        }).then(async (msg) => {

            // createMessageComponentCollector - collector
            const filter = (i) => i.user.id == interaction.user.id;
            const collectorIncomes = msg.createMessageComponentCollector({
                filter: filter,
                time: 600000
            });
            collectorIncomes.on("collect", async (iIncomes) => {

                // currentDay - button - init
                if (iIncomes.customId == "currentDay") {

                    // deferUpdate - postphone the update
                    await iIncomes.deferUpdate();

                    // variables - incomes - today
                    const todaysOrders = await dbSales.get(`${moment().format(`L`)}.requests`) || 0;
                    const todaysReceipts = await dbSales.get(`${moment().format(`L`)}.receipts`) || 0;

                    // row - incomes
                    const rowIncomes = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`previousPage`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                        );

                    // embed - incomes
                    const embedIncomes = new EmbedBuilder()
                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                        .setTitle(`Estatísticas | Hoje`)
                        .setDescription(`📦 | Pedidos: **(${Number(todaysOrders)})**\n💸 | Total Recebido: **R$__${Number(todaysReceipts).toFixed(2)}__**`)
                        .setColor(`NotQuiteBlack`)
                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

                    // message - edit
                    await interaction.editReply({
                        embeds: [embedIncomes],
                        components: [rowIncomes]
                    });

                };

                // last7Days - button - init
                if (iIncomes.customId == "last7Days") {

                    // deferUpdate - postphone the update
                    await iIncomes.deferUpdate();

                    // variables - incomes - last 7 days
                    let ordersLast7Days = 0;
                    let receiptsLast7Days = 0;

                    // set orders from the last 7 days in the variable (ordersLast7Days)
                    ordersLast7Days = Number(ordersLast7Days) + Number(dbSales.get(`${moment().subtract(1, `days`).format(`L`)}.requests`) || 0);
                    ordersLast7Days = Number(ordersLast7Days) + Number(dbSales.get(`${moment().subtract(2, `days`).format(`L`)}.requests`) || 0);
                    ordersLast7Days = Number(ordersLast7Days) + Number(dbSales.get(`${moment().subtract(3, `days`).format(`L`)}.requests`) || 0);
                    ordersLast7Days = Number(ordersLast7Days) + Number(dbSales.get(`${moment().subtract(4, `days`).format(`L`)}.requests`) || 0);
                    ordersLast7Days = Number(ordersLast7Days) + Number(dbSales.get(`${moment().subtract(5, `days`).format(`L`)}.requests`) || 0);
                    ordersLast7Days = Number(ordersLast7Days) + Number(dbSales.get(`${moment().subtract(6, `days`).format(`L`)}.requests`) || 0);
                    ordersLast7Days = Number(ordersLast7Days) + Number(dbSales.get(`${moment().subtract(7, `days`).format(`L`)}.requests`) || 0);

                    // set receipts from the last 7 days in the variable (receiptsLast7Days)
                    receiptsLast7Days = Number(receiptsLast7Days) + Number(dbSales.get(`${moment().subtract(1, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast7Days = Number(receiptsLast7Days) + Number(dbSales.get(`${moment().subtract(2, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast7Days = Number(receiptsLast7Days) + Number(dbSales.get(`${moment().subtract(3, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast7Days = Number(receiptsLast7Days) + Number(dbSales.get(`${moment().subtract(4, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast7Days = Number(receiptsLast7Days) + Number(dbSales.get(`${moment().subtract(5, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast7Days = Number(receiptsLast7Days) + Number(dbSales.get(`${moment().subtract(6, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast7Days = Number(receiptsLast7Days) + Number(dbSales.get(`${moment().subtract(7, `days`).format(`L`)}.receipts`) || 0);

                    // row - incomes
                    const rowIncomes = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`previousPage`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                        );

                    // embed - incomes
                    const embedIncomes = new EmbedBuilder()
                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                        .setTitle(`Estatísticas | Últimos 7 Dias`)
                        .setDescription(`📦 | Pedidos: **(${Number(ordersLast7Days)})**\n💸 | Total Recebido: **R$__${Number(receiptsLast7Days).toFixed(2)}__**`)
                        .setColor(`NotQuiteBlack`)
                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

                    // message - edit
                    await interaction.editReply({
                        embeds: [embedIncomes],
                        components: [rowIncomes]
                    });

                };

                // last30Days - button - init
                if (iIncomes.customId == "last30Days") {

                    // deferUpdate - postphone the update
                    await iIncomes.deferUpdate();

                    // variables - incomes - last 30 days
                    let ordersLast30Days = 0;
                    let receiptsLast30Days = 0;

                    // set orders from the last 30 days in the variable (ordersLast30Days)
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(8, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(9, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(10, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(11, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(12, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(13, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(14, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(15, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(16, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(17, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(18, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(19, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(20, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(21, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(22, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(23, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(24, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(25, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(26, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(27, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(28, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(29, `days`).format(`L`)}.requests`) || 0);
                    ordersLast30Days = Number(ordersLast30Days) + Number(dbSales.get(`${moment().subtract(30, `days`).format(`L`)}.requests`) || 0);

                    // set receipts from the last 30 days in the variable (receiptsLast30Days)
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(8, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(9, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(10, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(11, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(12, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(13, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(14, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(15, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(16, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(17, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(18, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(19, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(20, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(21, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(22, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(23, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(24, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(25, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(26, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(27, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(28, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(29, `days`).format(`L`)}.receipts`) || 0);
                    receiptsLast30Days = Number(receiptsLast30Days) + Number(dbSales.get(`${moment().subtract(30, `days`).format(`L`)}.receipts`) || 0);

                    // row - incomes
                    const rowIncomes = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`previousPage`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                        );

                    // embed - incomes
                    const embedIncomes = new EmbedBuilder()
                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                        .setTitle(`Estatísticas | Últimos 30 Dias`)
                        .setDescription(`📦 | Pedidos: **(${Number(ordersLast30Days)})**\n💸 | Total Recebido: **R$__${Number(receiptsLast30Days).toFixed(2)}__**`)
                        .setColor(`NotQuiteBlack`)
                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

                    // message - edit
                    await interaction.editReply({
                        embeds: [embedIncomes],
                        components: [rowIncomes]
                    });

                };

                // allPeriod - button - init
                if (iIncomes.customId == "allPeriod") {

                    // deferUpdate - postphone the update
                    await iIncomes.deferUpdate();

                    // variables - incomes
                    let allOrdersLast = 0;
                    let allReceiptsLast = 0;

                    // set all orders in the variable (allOrdersLast)
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(1, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(2, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(3, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(4, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(5, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(6, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(7, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(8, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(9, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(10, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(11, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(12, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(13, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(14, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(15, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(16, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(17, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(18, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(19, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(20, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(21, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(22, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(23, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(24, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(25, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(26, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(27, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(28, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(29, `days`).format(`L`)}.requests`) || 0);
                    allOrdersLast = Number(allOrdersLast) + Number(dbSales.get(`${moment().subtract(30, `days`).format(`L`)}.requests`) || 0);

                    // set all receipts to the variable (allReceiptsLast)
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(1, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(2, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(3, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(4, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(5, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(6, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(7, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(8, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(9, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(10, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(11, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(12, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(13, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(14, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(15, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(16, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(17, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(18, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(19, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(20, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(21, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(22, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(23, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(24, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(25, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(26, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(27, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(28, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(29, `days`).format(`L`)}.receipts`) || 0);
                    allReceiptsLast = Number(allReceiptsLast) + Number(dbSales.get(`${moment().subtract(30, `days`).format(`L`)}.receipts`) || 0);

                    // row - incomes
                    const rowIncomes = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`previousPage`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                        );

                    // embed - incomes
                    const embedIncomes = new EmbedBuilder()
                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                        .setTitle(`Estatísticas | Todos Periodo`)
                        .setDescription(`📦 | Pedidos: **(${Number(allOrdersLast)})**\n💸 | Total Recebido: **R$__${Number(allReceiptsLast).toFixed(2)}__**`)
                        .setColor(`NotQuiteBlack`)
                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

                    // message - edit
                    await interaction.editReply({
                        embeds: [embedIncomes],
                        components: [rowIncomes]
                    });

                };

                // previousPage - button - global
                if (iIncomes.customId == "previousPage") {

                    // deferUpdate - postphone the update
                    await iIncomes.deferUpdate();

                    // message - edit
                    await interaction.editReply({
                        embeds: [embedInit],
                        components: [rowInit]
                    });

                };

            });

            // end of time - collector
            collectorIncomes.on("end", async (c, r) => {
                if (r == "time") {

                    // message - edit
                    await interaction.editReply({
                        content: `⚙ | Use o comando novamente.`,
                        embeds: [],
                        components: []
                    }).catch(async (err) => {
                        return;
                    });

                };
            });

        });

    },

};