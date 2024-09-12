// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbProfiles = new JsonDatabase({ databasePath: "./databases/dbProfiles.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("rank-adm")
        .setDescription("[🛠/💰] Veja o rank dos usuários que mais compraram!")
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

        // message - loading
        await interaction.reply({
            content: `🔁 | Carregando ...`
        }).then(async (msg) => {

            // interaction - id
            const iId = interaction.id;

            // object values - items
            const allItems = await Promise.all(
                dbProfiles.all().sort((a, b) => b.data.paidsTotal - a.data.paidsTotal)
                    .filter((profile) => profile.data.paidsTotal > 0.00)
                    .map(async (profile, index) => {

                        // user - fetched
                        let userFetched = ``;

                        // try catch - fetch - user
                        try {

                            // user - fetch
                            const userFetch = await client.users.fetch(profile.ID);
                            userFetched = userFetch;

                        } catch (err) {
                            userFetched = `none`;
                        };

                        // rank - position
                        const userPosition = index + 1;

                        // variables with profile information
                        const userPaidsTotal = profile.data.paidsTotal;

                        // rank - position - emoji
                        const userPositionEmoji =
                            userPosition == 1 ? `🥇` :
                                userPosition == 2 ? `🥈` :
                                    userPosition == 3 ? `🥉` :
                                        `🏅`;

                        return `${userPositionEmoji} | **__${userPosition}°__** - ${userFetched != `none` ? `${userFetched.username} | ${userFetched.id}` : `__Usuário não encontrado!__`}\n💸 | Gasto: **R$__${Number(userPaidsTotal).toFixed(2)}__**`;
                    })
            );

            // no items were found
            if (allItems <= 0) {
                await interaction.editReply({
                    content: `❌ | Nenhum usuário foi encontrado.`,
                    ephemeral: true
                });
                return;
            };

            // variables for page control
            let currentPage = 1;
            const itemsPerPage = 10;

            // function to update the message based on the current page
            async function updateMessagePage(page) {

                // similar calculations as above to determine skins for the current page
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const itemsForPage = allItems.slice(startIndex, endIndex);

                // creates the embed description with the skins for the current page
                const description = itemsForPage.join("\n\n");

                // creates the embed for the current page based on the updated description
                const embedPage = new EmbedBuilder()
                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                    .setTitle(`${client.user.username} | Rank`)
                    .setDescription(description)
                    .setColor(`NotQuiteBlack`)
                    .setFooter({ text: `Gerencie as páginas usando os botões abaixo.` });

                // updates the message with the corresponding embed and navigation buttons
                await interaction.editReply({
                    content: ``,
                    embeds: [embedPage],
                    components: [createRowPage(page)]
                });

            };

            // function to create the row with the navigation buttons
            function createRowPage(page) {

                // row - page
                const rowPage = new ActionRowBuilder();

                // total page
                const totalPage = Math.ceil(allItems.length / itemsPerPage);

                // do the checks (1)
                if (page != 1 && page != totalPage) {

                    // add components
                    rowPage.addComponents(
                        new ButtonBuilder().setCustomId(`backMax-${iId}`).setEmoji(`⏮`).setStyle(`Primary`),
                        new ButtonBuilder().setCustomId(`back-${iId}`).setEmoji(`⬅`).setStyle(`Primary`),
                        new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`next-${iId}`).setEmoji(`➡`).setStyle(`Primary`),
                        new ButtonBuilder().setCustomId(`nextMax-${iId}`).setEmoji(`⏭`).setStyle(`Primary`),
                    );

                } else if (allItems.length < (itemsPerPage + 1)) {

                    // add components
                    rowPage.addComponents(
                        new ButtonBuilder().setCustomId(`backMax-${iId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`back-${iId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`next-${iId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`nextMax-${iId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true)
                    );

                } else if (page <= 1) {

                    // add components
                    rowPage.addComponents(
                        new ButtonBuilder().setCustomId(`backMax-${iId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`back-${iId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`next-${iId}`).setEmoji(`➡`).setStyle(`Primary`),
                        new ButtonBuilder().setCustomId(`nextMax-${iId}`).setEmoji(`⏭`).setStyle(`Primary`)
                    );

                } else {

                    // add components
                    rowPage.addComponents(
                        new ButtonBuilder().setCustomId(`backMax-${iId}`).setEmoji(`⏮`).setStyle(`Primary`),
                        new ButtonBuilder().setCustomId(`back-${iId}`).setEmoji(`⬅`).setStyle(`Primary`),
                        new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`next-${iId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`nextMax-${iId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true),
                    );

                };

                // return - rowPage
                return rowPage;

            };

            // calls the function to edit the message
            await updateMessagePage(currentPage);

            // createMessageComponentCollector - collector
            const collectorItemBts = msg.createMessageComponentCollector({
                time: 600000
            });
            collectorItemBts.on("collect", async (iItemBt) => {

                // backMax - button - page
                if (iItemBt.customId == `backMax-${iId}` && currentPage > 1) {

                    // deferUpdate - postphone the update
                    await iItemBt.deferUpdate();

                    // shrinks the current page
                    currentPage = 1;

                    // update message by calling function
                    await updateMessagePage(currentPage);

                };

                // back - button - page
                if (iItemBt.customId == `back-${iId}` && currentPage > 1) {

                    // deferUpdate - postphone the update
                    await iItemBt.deferUpdate();

                    // shrinks the current page
                    currentPage--;

                    // update message by calling function
                    await updateMessagePage(currentPage);

                };

                // next - button - page
                if (iItemBt.customId == `next-${iId}` && currentPage < Math.ceil(allItems.length / itemsPerPage)) {

                    // deferUpdate - postphone the update
                    await iItemBt.deferUpdate();

                    // shrinks the current page
                    currentPage++;

                    // update message by calling function
                    await updateMessagePage(currentPage);

                };

                // nextMax - button - page
                if (iItemBt.customId == `nextMax-${iId}` && currentPage < Math.ceil(allItems.length / itemsPerPage)) {

                    // deferUpdate - postphone the update
                    await iItemBt.deferUpdate();

                    // calculates the total number of pages
                    const totalPages = Math.ceil(allItems.length / itemsPerPage);

                    // shrinks the current page
                    currentPage = totalPages;

                    // update message by calling function
                    await updateMessagePage(currentPage);

                };

            });

            // end of time - collector
            collectorItemBts.on("end", async (c, r) => {
                if (r == "time") {

                    // calculates the total number of pages
                    const totalPages = Math.ceil(allItems.length / itemsPerPage);

                    // message - edit
                    await interaction.editReply({
                        components: [new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`back-${iId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${currentPage}/${totalPages}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`nextMax-${iId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true)
                            )
                        ]
                    });

                };
            });

        });

    },
};