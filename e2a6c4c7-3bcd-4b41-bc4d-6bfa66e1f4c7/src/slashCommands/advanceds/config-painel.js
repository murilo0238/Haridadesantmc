// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// url
const url = require("node:url");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbPanels = new JsonDatabase({ databasePath: "./databases/dbPanels.json" });
const dbProducts = new JsonDatabase({ databasePath: "./databases/dbProducts.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("config-painel")
        .setDescription("[🛠/💰] Configure um painel de produtos!")
        .addStringOption(opString => opString
            .setName("id")
            .setDescription("ID do Painel")
            .setMaxLength(25)
            .setAutocomplete(true)
            .setRequired(true)
        )
        .setDMPermission(false),

    // autocomplete
    async autocomplete(interaction, client) {

        // choices - global
        const choices = [];

        // user without permission for dbPerms (wio.db)
        if (!dbPerms.has(interaction.user.id)) {
            const noPermOption = {
                name: "Você não tem permissão para usar este comando!",
                value: "no-perms"
            };
            choices.push(noPermOption);
            await interaction.respond(
                choices.map(choice => ({ name: choice.name, value: choice.value })),
            );
            return;
        };

        // pull all panels into dbPanels (wio.db)
        for (const panel of dbPanels.all()) {
            choices.push({
                name: `ID: ${panel.ID} | Produtos: ${Object.keys(panel.data.products).length}`,
                value: panel.ID,
            });
        };
        choices.sort((a, b) => a.value - b.value);

        // search system - autocomplete
        const searchId = interaction.options.getString("id");
        if (searchId) {

            const filteredChoices = choices.filter(choice => {
                return choice.value.startsWith(searchId);
            });
            await interaction.respond(
                filteredChoices.map(choice => ({ name: choice.name, value: choice.value })),
            );

        } else {

            const limitedChoices = choices.slice(0, 25);
            await interaction.respond(
                limitedChoices.map(choice => ({ name: choice.name, value: choice.value }))
            );
        };

    },

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

        // id panel
        const idPanel = interaction.options.getString("id");

        // inserted panel was not found in dbPanels (wio.db)
        if (!dbPanels.has(idPanel)) {
            await interaction.reply({
                content: `❌ | ID do painel: **${idPanel}** não foi encontrado.`,
                ephemeral: true
            });
            return;
        };

        // row panel - button
        const rowPanel = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`configEmbed`).setLabel(`Configurar Embed`).setEmoji(`🌎`).setStyle(`Primary`),
                new ButtonBuilder().setCustomId(`configProducts`).setLabel(`Configurar Produtos`).setEmoji(`🛒`).setStyle(`Primary`),
                new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                new ButtonBuilder().setCustomId(`deletePanel`).setLabel(`DELETAR`).setEmoji(`🗑`).setStyle(`Danger`)
            );

        // embed panel
        const embedPanel = new EmbedBuilder()
            .setTitle(`${client.user.username} | Configurando Painel`)
            .setDescription(`**⚙ | Gerencie o painel utilizando as opções/botões abaixo.**`)
            .setColor(`NotQuiteBlack`)
            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

        // message - send
        await interaction.reply({
            embeds: [embedPanel],
            components: [rowPanel]
        }).then(async (msg) => {

            // createMessageComponentCollector - collector
            const filter = (m) => m.user.id == interaction.user.id;
            const collectorConfig = msg.createMessageComponentCollector({
                filter: filter,
                time: 600000
            });
            collectorConfig.on("collect", async (iConfig) => {

                // configEmbed - option
                if (iConfig.customId == `configEmbed`) {

                    // deferUpdate - postphone the update
                    await iConfig.deferUpdate();

                    // variables with panel embed information
                    const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                    const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                    const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                    const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                    const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                    const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                    // variables with panel select menu information
                    const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                    // row panel embed - select menu (1)
                    const rowPanelEmbed1 = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder().setCustomId(`changesConfigPanelEmbed`).setPlaceholder(`Selecione uma opção (Embed)`)
                                .setOptions(
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Título`).setEmoji(`⚙`).setDescription(`Altere o título da embed.`).setValue(`changeTitle`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Descrição`).setEmoji(`⚙`).setDescription(`Altere a descrição da embed.`).setValue(`changeDescription`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Rodapé`).setEmoji(`⚙`).setDescription(`Altere o rodapé (footer) da embed.`).setValue(`changeFooter`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Placeholder`).setEmoji(`⚙`).setDescription(`Altere o placeholder do select menu.`).setValue(`changePlaceholder`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor da Embed`).setEmoji(`⚙`).setDescription(`Altere a cor da embed.`).setValue(`changeColor`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`⚙`).setDescription(`Altere a banner da embed.`).setValue(`changeBanner`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setDescription(`Altere a miniatura da embed.`).setValue(`changeThumbnail`),
                                )
                        );

                    // row panel embed - button (2)
                    const rowPanelEmbed2 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`previousPanelEmbed`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                        );

                    // embed panel embed
                    const embedPanelEmbed = new EmbedBuilder()
                        .setTitle(`Título: ${titleP}`)
                        .setDescription(`**📜 | Descrição:**\n${descriptionP}\n\n**🖌 | Cor Embed:** ${colorP != "none" ? colorP : "\`Não configurado(a).\`"}\n**🔎 | Placeholder:** ${placeholderP}\n**🖼 | Banner:** ${bannerP != "none" ? `[Link da Imagem](${bannerP})` : "\`Não configurado(a).\`"}\n**🖼 | Miniatura:** ${thumbP != "none" ? `[Link da Imagem](${thumbP})` : "\`Não configurado(a).\`"}`)
                        .setColor(`NotQuiteBlack`)
                        .setFooter({ text: `Rodapé: ${footerP != "none" ? footerP : "Sem Rodapé"}` });

                    // message - edit
                    await interaction.editReply({
                        embeds: [embedPanelEmbed],
                        components: [rowPanelEmbed1, rowPanelEmbed2]
                    }).then(async (msgPanelEmbed) => {

                        // createMessageComponentCollector - collector
                        const filter = (m) => m.user.id == interaction.user.id;
                        const collectorPanelEmbed = msgPanelEmbed.createMessageComponentCollector({
                            filter: filter,
                            time: 600000
                        });
                        collectorPanelEmbed.on("collect", async (iPanelEmbed) => {

                            // changesConfigPanelEmbed - select menu
                            if (iPanelEmbed.customId == `changesConfigPanelEmbed`) {

                                // edit the message and remove the selected option
                                await interaction.editReply({
                                    components: [rowPanelEmbed1, rowPanelEmbed2]
                                });

                                // value id
                                const valueId = iPanelEmbed.values[0];

                                // changeTitle - option
                                if (valueId == `changeTitle`) {

                                    // create the modal
                                    const modal = new ModalBuilder()
                                        .setCustomId(`modalTitle-${idPanel}`)
                                        .setTitle(`🛠 | Título da Embed`);

                                    // creates the components for the modal
                                    const input = new TextInputBuilder()
                                        .setCustomId('newInfoText')
                                        .setLabel(`Novo Título:`)
                                        .setMaxLength(38)
                                        .setPlaceholder(`Insira um título para a embed ...`)
                                        .setRequired(true)
                                        .setStyle(`Short`);

                                    // rows for components
                                    const iInput = new ActionRowBuilder()
                                        .addComponents(input);

                                    // add the rows to the modal
                                    await modal.addComponents(iInput);

                                    // open the modal
                                    await iPanelEmbed.showModal(modal);

                                    // event - once - interactionCreate
                                    client.once("interactionCreate", async (iModal) => {

                                        // isModalSubmit
                                        if (iModal.isModalSubmit()) {

                                            // modalTitle - modal
                                            if (iModal.customId == `modalTitle-${idPanel}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // title inserted
                                                const infoInserted = iModal.fields.getTextInputValue(`newInfoText`)
                                                    .trim()
                                                    .replace(/[*_~`]|^>+/g, ``);

                                                // set the information in dbPanels (wio.db)
                                                await dbPanels.set(`${idPanel}.embed.title`, infoInserted);

                                                // variables with panel embed information
                                                const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                                                const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                                                const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                                                const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                                                const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                                                const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                                                // variables with panel select menu information
                                                const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                                                // row panel embed - select menu (1)
                                                const rowPanelEmbed1 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new StringSelectMenuBuilder().setCustomId(`changesConfigPanelEmbed`).setPlaceholder(`Selecione uma opção (Embed)`)
                                                            .setOptions(
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Título`).setEmoji(`⚙`).setDescription(`Altere o título da embed.`).setValue(`changeTitle`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Descrição`).setEmoji(`⚙`).setDescription(`Altere a descrição da embed.`).setValue(`changeDescription`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Rodapé`).setEmoji(`⚙`).setDescription(`Altere o rodapé (footer) da embed.`).setValue(`changeFooter`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Placeholder`).setEmoji(`⚙`).setDescription(`Altere o placeholder do select menu.`).setValue(`changePlaceholder`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor da Embed`).setEmoji(`⚙`).setDescription(`Altere a cor da embed.`).setValue(`changeColor`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`⚙`).setDescription(`Altere a banner da embed.`).setValue(`changeBanner`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setDescription(`Altere a miniatura da embed.`).setValue(`changeThumbnail`),
                                                            )
                                                    );

                                                // row panel embed - button (2)
                                                const rowPanelEmbed2 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPanelEmbed`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                                    );

                                                // embed panel embed
                                                const embedPanelEmbed = new EmbedBuilder()
                                                    .setTitle(`Título: ${titleP}`)
                                                    .setDescription(`**📜 | Descrição:**\n${descriptionP}\n\n**🖌 | Cor Embed:** ${colorP != "none" ? colorP : "\`Não configurado(a).\`"}\n**🔎 | Placeholder:** ${placeholderP}\n**🖼 | Banner:** ${bannerP != "none" ? `[Link da Imagem](${bannerP})` : "\`Não configurado(a).\`"}\n**🖼 | Miniatura:** ${thumbP != "none" ? `[Link da Imagem](${thumbP})` : "\`Não configurado(a).\`"}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Rodapé: ${footerP != "none" ? footerP : "Sem Rodapé"}` });

                                                // message - edit
                                                await interaction.editReply({
                                                    embeds: [embedPanelEmbed],
                                                    components: [rowPanelEmbed1, rowPanelEmbed2]
                                                });

                                            };

                                        };

                                    });

                                };

                                // changeDescription - option
                                if (valueId == `changeDescription`) {

                                    // create the modal
                                    const modal = new ModalBuilder()
                                        .setCustomId(`modalDesc-${idPanel}`)
                                        .setTitle(`🛠 | Descrição da Embed`);

                                    // creates the components for the modal
                                    const input = new TextInputBuilder()
                                        .setCustomId('newInfoText')
                                        .setLabel(`Nova Descrição:`)
                                        .setMaxLength(1800)
                                        .setPlaceholder(`Insira uma descrição para a embed ...`)
                                        .setRequired(true)
                                        .setStyle(`Paragraph`);

                                    // rows for components
                                    const iInput = new ActionRowBuilder()
                                        .addComponents(input);

                                    // add the rows to the modal
                                    await modal.addComponents(iInput);

                                    // open the modal
                                    await iPanelEmbed.showModal(modal);

                                    // event - once - interactionCreate
                                    client.once("interactionCreate", async (iModal) => {

                                        // isModalSubmit
                                        if (iModal.isModalSubmit()) {

                                            // modalDesc - modal
                                            if (iModal.customId == `modalDesc-${idPanel}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // desc inserted
                                                const infoInserted = iModal.fields.getTextInputValue(`newInfoText`)
                                                    .trim()
                                                    .replace(/[*_~`]|^>+/g, ``);

                                                // set the information in dbPanels (wio.db)
                                                await dbPanels.set(`${idPanel}.embed.description`, infoInserted);

                                                // variables with panel embed information
                                                const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                                                const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                                                const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                                                const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                                                const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                                                const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                                                // variables with panel select menu information
                                                const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                                                // row panel embed - select menu (1)
                                                const rowPanelEmbed1 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new StringSelectMenuBuilder().setCustomId(`changesConfigPanelEmbed`).setPlaceholder(`Selecione uma opção (Embed)`)
                                                            .setOptions(
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Título`).setEmoji(`⚙`).setDescription(`Altere o título da embed.`).setValue(`changeTitle`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Descrição`).setEmoji(`⚙`).setDescription(`Altere a descrição da embed.`).setValue(`changeDescription`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Rodapé`).setEmoji(`⚙`).setDescription(`Altere o rodapé (footer) da embed.`).setValue(`changeFooter`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Placeholder`).setEmoji(`⚙`).setDescription(`Altere o placeholder do select menu.`).setValue(`changePlaceholder`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor da Embed`).setEmoji(`⚙`).setDescription(`Altere a cor da embed.`).setValue(`changeColor`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`⚙`).setDescription(`Altere a banner da embed.`).setValue(`changeBanner`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setDescription(`Altere a miniatura da embed.`).setValue(`changeThumbnail`),
                                                            )
                                                    );

                                                // row panel embed - button (2)
                                                const rowPanelEmbed2 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPanelEmbed`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                                    );

                                                // embed panel embed
                                                const embedPanelEmbed = new EmbedBuilder()
                                                    .setTitle(`Título: ${titleP}`)
                                                    .setDescription(`**📜 | Descrição:**\n${descriptionP}\n\n**🖌 | Cor Embed:** ${colorP != "none" ? colorP : "\`Não configurado(a).\`"}\n**🔎 | Placeholder:** ${placeholderP}\n**🖼 | Banner:** ${bannerP != "none" ? `[Link da Imagem](${bannerP})` : "\`Não configurado(a).\`"}\n**🖼 | Miniatura:** ${thumbP != "none" ? `[Link da Imagem](${thumbP})` : "\`Não configurado(a).\`"}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Rodapé: ${footerP != "none" ? footerP : "Sem Rodapé"}` });

                                                // message - edit
                                                await interaction.editReply({
                                                    embeds: [embedPanelEmbed],
                                                    components: [rowPanelEmbed1, rowPanelEmbed2]
                                                });

                                            };

                                        };

                                    });

                                };

                                // changeFooter - option
                                if (valueId == `changeFooter`) {

                                    // create the modal
                                    const modal = new ModalBuilder()
                                        .setCustomId(`modalFooter-${idPanel}`)
                                        .setTitle(`🛠 | Rodapé da Embed`);

                                    // creates the components for the modal
                                    const input = new TextInputBuilder()
                                        .setCustomId('newInfoText')
                                        .setLabel(`Novo Rodapé:`)
                                        .setMaxLength(48)
                                        .setPlaceholder(`Digite "remover" para remover o atual`)
                                        .setRequired(true)
                                        .setStyle(`Short`);

                                    // rows for components
                                    const iInput = new ActionRowBuilder()
                                        .addComponents(input);

                                    // add the rows to the modal
                                    await modal.addComponents(iInput);

                                    // open the modal
                                    await iPanelEmbed.showModal(modal);

                                    // event - once - interactionCreate
                                    client.once("interactionCreate", async (iModal) => {

                                        // isModalSubmit
                                        if (iModal.isModalSubmit()) {

                                            // modalFooter - modal
                                            if (iModal.customId == `modalFooter-${idPanel}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // title inserted
                                                const infoInserted = iModal.fields.getTextInputValue(`newInfoText`)
                                                    .trim()
                                                    .replace(/[*_~`]|^>+/g, ``);

                                                // checks if the entered text is the same as remove
                                                if (infoInserted == `remover`) {

                                                    // remove the information in dbPanels (wio.db)
                                                    await dbPanels.set(`${idPanel}.embed.footer`, `none`);

                                                    // variables with panel embed information
                                                    const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                                                    const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                                                    const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                                                    const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                                                    const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                                                    const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                                                    // variables with panel select menu information
                                                    const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                                                    // row panel embed - select menu (1)
                                                    const rowPanelEmbed1 = new ActionRowBuilder()
                                                        .addComponents(
                                                            new StringSelectMenuBuilder().setCustomId(`changesConfigPanelEmbed`).setPlaceholder(`Selecione uma opção (Embed)`)
                                                                .setOptions(
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Título`).setEmoji(`⚙`).setDescription(`Altere o título da embed.`).setValue(`changeTitle`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Descrição`).setEmoji(`⚙`).setDescription(`Altere a descrição da embed.`).setValue(`changeDescription`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Rodapé`).setEmoji(`⚙`).setDescription(`Altere o rodapé (footer) da embed.`).setValue(`changeFooter`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Placeholder`).setEmoji(`⚙`).setDescription(`Altere o placeholder do select menu.`).setValue(`changePlaceholder`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor da Embed`).setEmoji(`⚙`).setDescription(`Altere a cor da embed.`).setValue(`changeColor`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`⚙`).setDescription(`Altere a banner da embed.`).setValue(`changeBanner`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setDescription(`Altere a miniatura da embed.`).setValue(`changeThumbnail`),
                                                                )
                                                        );

                                                    // row panel embed - button (2)
                                                    const rowPanelEmbed2 = new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`previousPanelEmbed`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                                        );

                                                    // embed panel embed
                                                    const embedPanelEmbed = new EmbedBuilder()
                                                        .setTitle(`Título: ${titleP}`)
                                                        .setDescription(`**📜 | Descrição:**\n${descriptionP}\n\n**🖌 | Cor Embed:** ${colorP != "none" ? colorP : "\`Não configurado(a).\`"}\n**🔎 | Placeholder:** ${placeholderP}\n**🖼 | Banner:** ${bannerP != "none" ? `[Link da Imagem](${bannerP})` : "\`Não configurado(a).\`"}\n**🖼 | Miniatura:** ${thumbP != "none" ? `[Link da Imagem](${thumbP})` : "\`Não configurado(a).\`"}`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Rodapé: ${footerP != "none" ? footerP : "Sem Rodapé"}` });

                                                    // message - edit
                                                    await interaction.editReply({
                                                        embeds: [embedPanelEmbed],
                                                        components: [rowPanelEmbed1, rowPanelEmbed2]
                                                    });

                                                    return;
                                                };

                                                // set the information in dbPanels (wio.db)
                                                await dbPanels.set(`${idPanel}.embed.footer`, infoInserted);

                                                // variables with panel embed information
                                                const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                                                const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                                                const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                                                const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                                                const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                                                const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                                                // variables with panel select menu information
                                                const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                                                // row panel embed - select menu (1)
                                                const rowPanelEmbed1 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new StringSelectMenuBuilder().setCustomId(`changesConfigPanelEmbed`).setPlaceholder(`Selecione uma opção (Embed)`)
                                                            .setOptions(
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Título`).setEmoji(`⚙`).setDescription(`Altere o título da embed.`).setValue(`changeTitle`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Descrição`).setEmoji(`⚙`).setDescription(`Altere a descrição da embed.`).setValue(`changeDescription`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Rodapé`).setEmoji(`⚙`).setDescription(`Altere o rodapé (footer) da embed.`).setValue(`changeFooter`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Placeholder`).setEmoji(`⚙`).setDescription(`Altere o placeholder do select menu.`).setValue(`changePlaceholder`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor da Embed`).setEmoji(`⚙`).setDescription(`Altere a cor da embed.`).setValue(`changeColor`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`⚙`).setDescription(`Altere a banner da embed.`).setValue(`changeBanner`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setDescription(`Altere a miniatura da embed.`).setValue(`changeThumbnail`),
                                                            )
                                                    );

                                                // row panel embed - button (2)
                                                const rowPanelEmbed2 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPanelEmbed`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                                    );

                                                // embed panel embed
                                                const embedPanelEmbed = new EmbedBuilder()
                                                    .setTitle(`Título: ${titleP}`)
                                                    .setDescription(`**📜 | Descrição:**\n${descriptionP}\n\n**🖌 | Cor Embed:** ${colorP != "none" ? colorP : "\`Não configurado(a).\`"}\n**🔎 | Placeholder:** ${placeholderP}\n**🖼 | Banner:** ${bannerP != "none" ? `[Link da Imagem](${bannerP})` : "\`Não configurado(a).\`"}\n**🖼 | Miniatura:** ${thumbP != "none" ? `[Link da Imagem](${thumbP})` : "\`Não configurado(a).\`"}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Rodapé: ${footerP != "none" ? footerP : "Sem Rodapé"}` });

                                                // message - edit
                                                await interaction.editReply({
                                                    embeds: [embedPanelEmbed],
                                                    components: [rowPanelEmbed1, rowPanelEmbed2]
                                                });

                                            };

                                        };

                                    });

                                };

                                // changePlaceholder - option
                                if (valueId == `changePlaceholder`) {

                                    // create the modal
                                    const modal = new ModalBuilder()
                                        .setCustomId(`modalPlaceholder-${idPanel}`)
                                        .setTitle(`🛠 | Placeholder`);

                                    // creates the components for the modal
                                    const input = new TextInputBuilder()
                                        .setCustomId('newInfoText')
                                        .setLabel(`Novo Placeholder:`)
                                        .setMaxLength(48)
                                        .setPlaceholder(`Insira um placeholder para o select menu ...`)
                                        .setRequired(true)
                                        .setStyle(`Short`);

                                    // rows for components
                                    const iInput = new ActionRowBuilder()
                                        .addComponents(input);

                                    // add the rows to the modal
                                    await modal.addComponents(iInput);

                                    // open the modal
                                    await iPanelEmbed.showModal(modal);

                                    // event - once - interactionCreate
                                    client.once("interactionCreate", async (iModal) => {

                                        // isModalSubmit
                                        if (iModal.isModalSubmit()) {

                                            // modalPlaceholder - modal
                                            if (iModal.customId == `modalPlaceholder-${idPanel}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // title inserted
                                                const infoInserted = iModal.fields.getTextInputValue(`newInfoText`)
                                                    .trim()
                                                    .replace(/[*_~`]|^>+/g, ``);

                                                // set the information in dbPanels (wio.db)
                                                await dbPanels.set(`${idPanel}.selectMenu.placeholder`, infoInserted);

                                                // variables with panel embed information
                                                const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                                                const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                                                const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                                                const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                                                const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                                                const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                                                // variables with panel select menu information
                                                const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                                                // row panel embed - select menu (1)
                                                const rowPanelEmbed1 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new StringSelectMenuBuilder().setCustomId(`changesConfigPanelEmbed`).setPlaceholder(`Selecione uma opção (Embed)`)
                                                            .setOptions(
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Título`).setEmoji(`⚙`).setDescription(`Altere o título da embed.`).setValue(`changeTitle`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Descrição`).setEmoji(`⚙`).setDescription(`Altere a descrição da embed.`).setValue(`changeDescription`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Rodapé`).setEmoji(`⚙`).setDescription(`Altere o rodapé (footer) da embed.`).setValue(`changeFooter`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Placeholder`).setEmoji(`⚙`).setDescription(`Altere o placeholder do select menu.`).setValue(`changePlaceholder`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor da Embed`).setEmoji(`⚙`).setDescription(`Altere a cor da embed.`).setValue(`changeColor`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`⚙`).setDescription(`Altere a banner da embed.`).setValue(`changeBanner`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setDescription(`Altere a miniatura da embed.`).setValue(`changeThumbnail`),
                                                            )
                                                    );

                                                // row panel embed - button (2)
                                                const rowPanelEmbed2 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPanelEmbed`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                                    );

                                                // embed panel embed
                                                const embedPanelEmbed = new EmbedBuilder()
                                                    .setTitle(`Título: ${titleP}`)
                                                    .setDescription(`**📜 | Descrição:**\n${descriptionP}\n\n**🖌 | Cor Embed:** ${colorP != "none" ? colorP : "\`Não configurado(a).\`"}\n**🔎 | Placeholder:** ${placeholderP}\n**🖼 | Banner:** ${bannerP != "none" ? `[Link da Imagem](${bannerP})` : "\`Não configurado(a).\`"}\n**🖼 | Miniatura:** ${thumbP != "none" ? `[Link da Imagem](${thumbP})` : "\`Não configurado(a).\`"}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Rodapé: ${footerP != "none" ? footerP : "Sem Rodapé"}` });

                                                // message - edit
                                                await interaction.editReply({
                                                    embeds: [embedPanelEmbed],
                                                    components: [rowPanelEmbed1, rowPanelEmbed2]
                                                });

                                            };

                                        };

                                    });

                                };

                                // changeColor - option
                                if (valueId == `changeColor`) {

                                    // create the modal
                                    const modal = new ModalBuilder()
                                        .setCustomId(`modalColor-${idPanel}`)
                                        .setTitle(`🛠 | Cor da Embed`);

                                    // creates the components for the modal
                                    const input = new TextInputBuilder()
                                        .setCustomId('newInfoText')
                                        .setLabel(`Nova Cor:`)
                                        .setMaxLength(7)
                                        .setPlaceholder(`Digite "remover" para remover a atual`)
                                        .setRequired(true)
                                        .setStyle(`Short`);

                                    // rows for components
                                    const iInput = new ActionRowBuilder()
                                        .addComponents(input);

                                    // add the rows to the modal
                                    await modal.addComponents(iInput);

                                    // open the modal
                                    await iPanelEmbed.showModal(modal);

                                    // event - once - interactionCreate
                                    client.once("interactionCreate", async (iModal) => {

                                        // isModalSubmit
                                        if (iModal.isModalSubmit()) {

                                            // modalColor - modal
                                            if (iModal.customId == `modalColor-${idPanel}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // title inserted
                                                const infoInserted = iModal.fields.getTextInputValue(`newInfoText`)
                                                    .trim();

                                                // checks if the entered text is the same as remove
                                                if (infoInserted == `remover`) {

                                                    // remove the information in dbPanels (wio.db)
                                                    await dbPanels.set(`${idPanel}.embed.color`, `none`);

                                                    // variables with panel embed information
                                                    const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                                                    const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                                                    const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                                                    const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                                                    const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                                                    const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                                                    // variables with panel select menu information
                                                    const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                                                    // row panel embed - select menu (1)
                                                    const rowPanelEmbed1 = new ActionRowBuilder()
                                                        .addComponents(
                                                            new StringSelectMenuBuilder().setCustomId(`changesConfigPanelEmbed`).setPlaceholder(`Selecione uma opção (Embed)`)
                                                                .setOptions(
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Título`).setEmoji(`⚙`).setDescription(`Altere o título da embed.`).setValue(`changeTitle`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Descrição`).setEmoji(`⚙`).setDescription(`Altere a descrição da embed.`).setValue(`changeDescription`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Rodapé`).setEmoji(`⚙`).setDescription(`Altere o rodapé (footer) da embed.`).setValue(`changeFooter`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Placeholder`).setEmoji(`⚙`).setDescription(`Altere o placeholder do select menu.`).setValue(`changePlaceholder`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor da Embed`).setEmoji(`⚙`).setDescription(`Altere a cor da embed.`).setValue(`changeColor`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`⚙`).setDescription(`Altere a banner da embed.`).setValue(`changeBanner`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setDescription(`Altere a miniatura da embed.`).setValue(`changeThumbnail`),
                                                                )
                                                        );

                                                    // row panel embed - button (2)
                                                    const rowPanelEmbed2 = new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`previousPanelEmbed`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                                        );

                                                    // embed panel embed
                                                    const embedPanelEmbed = new EmbedBuilder()
                                                        .setTitle(`Título: ${titleP}`)
                                                        .setDescription(`**📜 | Descrição:**\n${descriptionP}\n\n**🖌 | Cor Embed:** ${colorP != "none" ? colorP : "\`Não configurado(a).\`"}\n**🔎 | Placeholder:** ${placeholderP}\n**🖼 | Banner:** ${bannerP != "none" ? `[Link da Imagem](${bannerP})` : "\`Não configurado(a).\`"}\n**🖼 | Miniatura:** ${thumbP != "none" ? `[Link da Imagem](${thumbP})` : "\`Não configurado(a).\`"}`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Rodapé: ${footerP != "none" ? footerP : "Sem Rodapé"}` });

                                                    // message - edit
                                                    await interaction.editReply({
                                                        embeds: [embedPanelEmbed],
                                                        components: [rowPanelEmbed1, rowPanelEmbed2]
                                                    });

                                                    return;
                                                };

                                                // invalid color format
                                                const colorRegex = /^#[0-9A-Fa-f]{6}$/;
                                                if (!colorRegex.test(infoInserted)) {
                                                    await iModal.followUp({
                                                        content: `❌ | Formato de cor inválido.`,
                                                        ephemeral: true
                                                    });

                                                    return;
                                                };

                                                // set the information in dbPanels (wio.db)
                                                await dbPanels.set(`${idPanel}.embed.color`, infoInserted);

                                                // variables with panel embed information
                                                const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                                                const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                                                const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                                                const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                                                const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                                                const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                                                // variables with panel select menu information
                                                const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                                                // row panel embed - select menu (1)
                                                const rowPanelEmbed1 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new StringSelectMenuBuilder().setCustomId(`changesConfigPanelEmbed`).setPlaceholder(`Selecione uma opção (Embed)`)
                                                            .setOptions(
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Título`).setEmoji(`⚙`).setDescription(`Altere o título da embed.`).setValue(`changeTitle`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Descrição`).setEmoji(`⚙`).setDescription(`Altere a descrição da embed.`).setValue(`changeDescription`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Rodapé`).setEmoji(`⚙`).setDescription(`Altere o rodapé (footer) da embed.`).setValue(`changeFooter`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Placeholder`).setEmoji(`⚙`).setDescription(`Altere o placeholder do select menu.`).setValue(`changePlaceholder`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor da Embed`).setEmoji(`⚙`).setDescription(`Altere a cor da embed.`).setValue(`changeColor`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`⚙`).setDescription(`Altere a banner da embed.`).setValue(`changeBanner`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setDescription(`Altere a miniatura da embed.`).setValue(`changeThumbnail`),
                                                            )
                                                    );

                                                // row panel embed - button (2)
                                                const rowPanelEmbed2 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPanelEmbed`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                                    );

                                                // embed panel embed
                                                const embedPanelEmbed = new EmbedBuilder()
                                                    .setTitle(`Título: ${titleP}`)
                                                    .setDescription(`**📜 | Descrição:**\n${descriptionP}\n\n**🖌 | Cor Embed:** ${colorP != "none" ? colorP : "\`Não configurado(a).\`"}\n**🔎 | Placeholder:** ${placeholderP}\n**🖼 | Banner:** ${bannerP != "none" ? `[Link da Imagem](${bannerP})` : "\`Não configurado(a).\`"}\n**🖼 | Miniatura:** ${thumbP != "none" ? `[Link da Imagem](${thumbP})` : "\`Não configurado(a).\`"}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Rodapé: ${footerP != "none" ? footerP : "Sem Rodapé"}` });

                                                // message - edit
                                                await interaction.editReply({
                                                    embeds: [embedPanelEmbed],
                                                    components: [rowPanelEmbed1, rowPanelEmbed2]
                                                });

                                            };

                                        };

                                    });

                                };

                                // changeBanner - option
                                if (valueId == `changeBanner`) {

                                    // create the modal
                                    const modal = new ModalBuilder()
                                        .setCustomId(`modalBanner-${idPanel}`)
                                        .setTitle(`🛠 | Banner da Embed`);

                                    // creates the components for the modal
                                    const input = new TextInputBuilder()
                                        .setCustomId('newInfoText')
                                        .setLabel(`Novo Banner:`)
                                        .setMaxLength(280)
                                        .setPlaceholder(`Digite "remover" para remover o atual`)
                                        .setRequired(true)
                                        .setStyle(`Paragraph`);

                                    // rows for components
                                    const iInput = new ActionRowBuilder()
                                        .addComponents(input);

                                    // add the rows to the modal
                                    await modal.addComponents(iInput);

                                    // open the modal
                                    await iPanelEmbed.showModal(modal);

                                    // event - once - interactionCreate
                                    client.once("interactionCreate", async (iModal) => {

                                        // isModalSubmit
                                        if (iModal.isModalSubmit()) {

                                            // modalBanner - modal
                                            if (iModal.customId == `modalBanner-${idPanel}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // title inserted
                                                const infoInserted = iModal.fields.getTextInputValue(`newInfoText`)
                                                    .trim();

                                                // checks if the entered text is the same as remove
                                                if (infoInserted == `remover`) {

                                                    // remove the information in dbPanels (wio.db)
                                                    await dbPanels.set(`${idPanel}.embed.bannerUrl`, `none`);

                                                    // variables with panel embed information
                                                    const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                                                    const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                                                    const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                                                    const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                                                    const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                                                    const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                                                    // variables with panel select menu information
                                                    const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                                                    // row panel embed - select menu (1)
                                                    const rowPanelEmbed1 = new ActionRowBuilder()
                                                        .addComponents(
                                                            new StringSelectMenuBuilder().setCustomId(`changesConfigPanelEmbed`).setPlaceholder(`Selecione uma opção (Embed)`)
                                                                .setOptions(
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Título`).setEmoji(`⚙`).setDescription(`Altere o título da embed.`).setValue(`changeTitle`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Descrição`).setEmoji(`⚙`).setDescription(`Altere a descrição da embed.`).setValue(`changeDescription`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Rodapé`).setEmoji(`⚙`).setDescription(`Altere o rodapé (footer) da embed.`).setValue(`changeFooter`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Placeholder`).setEmoji(`⚙`).setDescription(`Altere o placeholder do select menu.`).setValue(`changePlaceholder`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor da Embed`).setEmoji(`⚙`).setDescription(`Altere a cor da embed.`).setValue(`changeColor`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`⚙`).setDescription(`Altere a banner da embed.`).setValue(`changeBanner`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setDescription(`Altere a miniatura da embed.`).setValue(`changeThumbnail`),
                                                                )
                                                        );

                                                    // row panel embed - button (2)
                                                    const rowPanelEmbed2 = new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`previousPanelEmbed`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                                        );

                                                    // embed panel embed
                                                    const embedPanelEmbed = new EmbedBuilder()
                                                        .setTitle(`Título: ${titleP}`)
                                                        .setDescription(`**📜 | Descrição:**\n${descriptionP}\n\n**🖌 | Cor Embed:** ${colorP != "none" ? colorP : "\`Não configurado(a).\`"}\n**🔎 | Placeholder:** ${placeholderP}\n**🖼 | Banner:** ${bannerP != "none" ? `[Link da Imagem](${bannerP})` : "\`Não configurado(a).\`"}\n**🖼 | Miniatura:** ${thumbP != "none" ? `[Link da Imagem](${thumbP})` : "\`Não configurado(a).\`"}`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Rodapé: ${footerP != "none" ? footerP : "Sem Rodapé"}` });

                                                    // message - edit
                                                    await interaction.editReply({
                                                        embeds: [embedPanelEmbed],
                                                        components: [rowPanelEmbed1, rowPanelEmbed2]
                                                    });

                                                    return;
                                                };

                                                // invalid link
                                                if (!url.parse(infoInserted).protocol || !url.parse(infoInserted).hostname) {
                                                    await iModal.followUp({
                                                        content: `❌ | O URL inserido não é válido.`,
                                                        ephemeral: true
                                                    });

                                                    return;
                                                };

                                                // set the information in dbPanels (wio.db)
                                                await dbPanels.set(`${idPanel}.embed.bannerUrl`, infoInserted);

                                                // variables with panel embed information
                                                const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                                                const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                                                const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                                                const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                                                const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                                                const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                                                // variables with panel select menu information
                                                const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                                                // row panel embed - select menu (1)
                                                const rowPanelEmbed1 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new StringSelectMenuBuilder().setCustomId(`changesConfigPanelEmbed`).setPlaceholder(`Selecione uma opção (Embed)`)
                                                            .setOptions(
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Título`).setEmoji(`⚙`).setDescription(`Altere o título da embed.`).setValue(`changeTitle`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Descrição`).setEmoji(`⚙`).setDescription(`Altere a descrição da embed.`).setValue(`changeDescription`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Rodapé`).setEmoji(`⚙`).setDescription(`Altere o rodapé (footer) da embed.`).setValue(`changeFooter`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Placeholder`).setEmoji(`⚙`).setDescription(`Altere o placeholder do select menu.`).setValue(`changePlaceholder`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor da Embed`).setEmoji(`⚙`).setDescription(`Altere a cor da embed.`).setValue(`changeColor`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`⚙`).setDescription(`Altere a banner da embed.`).setValue(`changeBanner`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setDescription(`Altere a miniatura da embed.`).setValue(`changeThumbnail`),
                                                            )
                                                    );

                                                // row panel embed - button (2)
                                                const rowPanelEmbed2 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPanelEmbed`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                                    );

                                                // embed panel embed
                                                const embedPanelEmbed = new EmbedBuilder()
                                                    .setTitle(`Título: ${titleP}`)
                                                    .setDescription(`**📜 | Descrição:**\n${descriptionP}\n\n**🖌 | Cor Embed:** ${colorP != "none" ? colorP : "\`Não configurado(a).\`"}\n**🔎 | Placeholder:** ${placeholderP}\n**🖼 | Banner:** ${bannerP != "none" ? `[Link da Imagem](${bannerP})` : "\`Não configurado(a).\`"}\n**🖼 | Miniatura:** ${thumbP != "none" ? `[Link da Imagem](${thumbP})` : "\`Não configurado(a).\`"}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Rodapé: ${footerP != "none" ? footerP : "Sem Rodapé"}` });

                                                // message - edit
                                                await interaction.editReply({
                                                    embeds: [embedPanelEmbed],
                                                    components: [rowPanelEmbed1, rowPanelEmbed2]
                                                });

                                            };

                                        };

                                    });

                                };

                                // changeThumbnail - option
                                if (valueId == `changeThumbnail`) {

                                    // create the modal
                                    const modal = new ModalBuilder()
                                        .setCustomId(`modalThumbnail-${idPanel}`)
                                        .setTitle(`🛠 | Miniatura da Embed`);

                                    // creates the components for the modal
                                    const input = new TextInputBuilder()
                                        .setCustomId('newInfoText')
                                        .setLabel(`Nova Miniatura:`)
                                        .setMaxLength(280)
                                        .setPlaceholder(`Digite "remover" para remover a atual`)
                                        .setRequired(true)
                                        .setStyle(`Paragraph`);

                                    // rows for components
                                    const iInput = new ActionRowBuilder()
                                        .addComponents(input);

                                    // add the rows to the modal
                                    await modal.addComponents(iInput);

                                    // open the modal
                                    await iPanelEmbed.showModal(modal);

                                    // event - once - interactionCreate
                                    client.once("interactionCreate", async (iModal) => {

                                        // isModalSubmit
                                        if (iModal.isModalSubmit()) {

                                            // modalThumbnail - modal
                                            if (iModal.customId == `modalThumbnail-${idPanel}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // title inserted
                                                const infoInserted = iModal.fields.getTextInputValue(`newInfoText`)
                                                    .trim();

                                                // checks if the entered text is the same as remove
                                                if (infoInserted == `remover`) {

                                                    // remove the information in dbPanels (wio.db)
                                                    await dbPanels.set(`${idPanel}.embed.thumbUrl`, `none`);

                                                    // variables with panel embed information
                                                    const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                                                    const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                                                    const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                                                    const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                                                    const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                                                    const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                                                    // variables with panel select menu information
                                                    const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                                                    // row panel embed - select menu (1)
                                                    const rowPanelEmbed1 = new ActionRowBuilder()
                                                        .addComponents(
                                                            new StringSelectMenuBuilder().setCustomId(`changesConfigPanelEmbed`).setPlaceholder(`Selecione uma opção (Embed)`)
                                                                .setOptions(
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Título`).setEmoji(`⚙`).setDescription(`Altere o título da embed.`).setValue(`changeTitle`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Descrição`).setEmoji(`⚙`).setDescription(`Altere a descrição da embed.`).setValue(`changeDescription`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Rodapé`).setEmoji(`⚙`).setDescription(`Altere o rodapé (footer) da embed.`).setValue(`changeFooter`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Placeholder`).setEmoji(`⚙`).setDescription(`Altere o placeholder do select menu.`).setValue(`changePlaceholder`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor da Embed`).setEmoji(`⚙`).setDescription(`Altere a cor da embed.`).setValue(`changeColor`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`⚙`).setDescription(`Altere a banner da embed.`).setValue(`changeBanner`),
                                                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setDescription(`Altere a miniatura da embed.`).setValue(`changeThumbnail`),
                                                                )
                                                        );

                                                    // row panel embed - button (2)
                                                    const rowPanelEmbed2 = new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`previousPanelEmbed`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                                        );

                                                    // embed panel embed
                                                    const embedPanelEmbed = new EmbedBuilder()
                                                        .setTitle(`Título: ${titleP}`)
                                                        .setDescription(`**📜 | Descrição:**\n${descriptionP}\n\n**🖌 | Cor Embed:** ${colorP != "none" ? colorP : "\`Não configurado(a).\`"}\n**🔎 | Placeholder:** ${placeholderP}\n**🖼 | Banner:** ${bannerP != "none" ? `[Link da Imagem](${bannerP})` : "\`Não configurado(a).\`"}\n**🖼 | Miniatura:** ${thumbP != "none" ? `[Link da Imagem](${thumbP})` : "\`Não configurado(a).\`"}`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Rodapé: ${footerP != "none" ? footerP : "Sem Rodapé"}` });

                                                    // message - edit
                                                    await interaction.editReply({
                                                        embeds: [embedPanelEmbed],
                                                        components: [rowPanelEmbed1, rowPanelEmbed2]
                                                    });

                                                    return;
                                                };

                                                // invalid link
                                                if (!url.parse(infoInserted).protocol || !url.parse(infoInserted).hostname) {
                                                    await iModal.followUp({
                                                        content: `❌ | O URL inserido não é válido.`,
                                                        ephemeral: true
                                                    });

                                                    return;
                                                };

                                                // set the information in dbPanels (wio.db)
                                                await dbPanels.set(`${idPanel}.embed.thumbUrl`, infoInserted);

                                                // variables with panel embed information
                                                const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                                                const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                                                const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                                                const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                                                const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                                                const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                                                // variables with panel select menu information
                                                const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                                                // row panel embed - select menu (1)
                                                const rowPanelEmbed1 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new StringSelectMenuBuilder().setCustomId(`changesConfigPanelEmbed`).setPlaceholder(`Selecione uma opção (Embed)`)
                                                            .setOptions(
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Título`).setEmoji(`⚙`).setDescription(`Altere o título da embed.`).setValue(`changeTitle`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Descrição`).setEmoji(`⚙`).setDescription(`Altere a descrição da embed.`).setValue(`changeDescription`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Rodapé`).setEmoji(`⚙`).setDescription(`Altere o rodapé (footer) da embed.`).setValue(`changeFooter`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Placeholder`).setEmoji(`⚙`).setDescription(`Altere o placeholder do select menu.`).setValue(`changePlaceholder`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor da Embed`).setEmoji(`⚙`).setDescription(`Altere a cor da embed.`).setValue(`changeColor`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`⚙`).setDescription(`Altere a banner da embed.`).setValue(`changeBanner`),
                                                                new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setDescription(`Altere a miniatura da embed.`).setValue(`changeThumbnail`),
                                                            )
                                                    );

                                                // row panel embed - button (2)
                                                const rowPanelEmbed2 = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPanelEmbed`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                                    );

                                                // embed panel embed
                                                const embedPanelEmbed = new EmbedBuilder()
                                                    .setTitle(`Título: ${titleP}`)
                                                    .setDescription(`**📜 | Descrição:**\n${descriptionP}\n\n**🖌 | Cor Embed:** ${colorP != "none" ? colorP : "\`Não configurado(a).\`"}\n**🔎 | Placeholder:** ${placeholderP}\n**🖼 | Banner:** ${bannerP != "none" ? `[Link da Imagem](${bannerP})` : "\`Não configurado(a).\`"}\n**🖼 | Miniatura:** ${thumbP != "none" ? `[Link da Imagem](${thumbP})` : "\`Não configurado(a).\`"}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Rodapé: ${footerP != "none" ? footerP : "Sem Rodapé"}` });

                                                // message - edit
                                                await interaction.editReply({
                                                    embeds: [embedPanelEmbed],
                                                    components: [rowPanelEmbed1, rowPanelEmbed2]
                                                });

                                            };

                                        };

                                    });

                                };

                            };

                            // previousPanelEmbed - button
                            if (iPanelEmbed.customId == `previousPanelEmbed`) {

                                // deferUpdate - postphone the update
                                await iPanelEmbed.deferUpdate();

                                // message - edit
                                await interaction.editReply({
                                    embeds: [embedPanel],
                                    components: [rowPanel]
                                });

                                // stop the collector
                                await collectorPanelEmbed.stop();

                            };

                        });

                    });

                };

                // configProducts - option
                if (iConfig.customId == `configProducts`) {

                    // deferUpdate - postphone the update
                    await iConfig.deferUpdate();

                    // row panel products - select menu (1)
                    const rowPanelProducts1 = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder().setCustomId(`changesConfigPanelProducts`).setPlaceholder(`Selecione uma opção (Produtos)`)
                                .setOptions(
                                    new StringSelectMenuOptionBuilder().setLabel(`Adicionar Produto`).setEmoji(`➕`).setDescription(`Adicione mais produtos no painel.`).setValue(`addProduct`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Remover Produto`).setEmoji(`➖`).setDescription(`Remova produtos do painel.`).setValue(`removeProduct`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Sequência`).setEmoji(`🔎`).setDescription(`Altere a sequência de um produto.`).setValue(`changeSequence`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Emoji`).setEmoji(`🌎`).setDescription(`Altere o emoji de um produto no painel.`).setValue(`changeEmoji`),
                                )
                        );

                    // row panel products - button (2)
                    const rowPanelProducts2 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`previousPanelProducts`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                        );

                    // object values - items
                    let allProducts = [];
                    await Promise.all(
                        dbPanels.all().filter((panel) => panel.ID == idPanel)
                            .map(async (panel) => {

                                // get product ids
                                Object.keys(panel.data.products)
                                    .map(async (product, index) => {

                                        // emoji - product
                                        const emojiP = await dbPanels.get(`${idPanel}.products.${product}.emoji`);

                                        // pulls the products in variable
                                        allProducts.push(`${emojiP} | **__${index + 1}°__** - 📦 | **ID:** ${product}`);
                                    });

                            })
                    );

                    // embed panel products
                    const embedPanelProducts = new EmbedBuilder()
                        .setTitle(`${client.user.username} | Produto(s)`)
                        .setDescription(allProducts.join(`\n`) || `Sem produtos. Adicione!`)
                        .setColor(`NotQuiteBlack`)
                        .setFooter({ text: `Gerencie os produtos do painel utilizando as opções/botões abaixo.`, iconURL: client.user.avatarURL() });

                    // message - edit
                    await interaction.editReply({
                        embeds: [embedPanelProducts],
                        components: [rowPanelProducts1, rowPanelProducts2]
                    }).then(async (msgPanelEmbed) => {

                        // createMessageComponentCollector - collector
                        const filter = (m) => m.user.id == interaction.user.id;
                        const collectorPanelProducts = msgPanelEmbed.createMessageComponentCollector({
                            filter: filter,
                            time: 600000
                        });
                        collectorPanelProducts.on("collect", async (iPanelProducts) => {

                            // changesConfigPanelProducts - select menu
                            if (iPanelProducts.customId == `changesConfigPanelProducts`) {

                                // edit the message and remove the selected option
                                await interaction.editReply({
                                    components: [rowPanelProducts1, rowPanelProducts2]
                                });

                                // value id
                                const valueId = iPanelProducts.values[0];

                                // addProduct - option
                                if (valueId == `addProduct`) {

                                    // create the modal
                                    const modal = new ModalBuilder()
                                        .setCustomId(`modalAddProduct-${idPanel}`)
                                        .setTitle(`➕ | Adicionar Produto`);

                                    // creates the components for the modal
                                    const input = new TextInputBuilder()
                                        .setCustomId('newInfoText')
                                        .setLabel(`ID do Produto:`)
                                        .setMaxLength(28)
                                        .setPlaceholder(`Insira o ID do produto que será adicionado ...`)
                                        .setRequired(true)
                                        .setStyle(`Short`);

                                    // rows for components
                                    const iInput = new ActionRowBuilder()
                                        .addComponents(input);

                                    // add the rows to the modal
                                    await modal.addComponents(iInput);

                                    // open the modal
                                    await iPanelProducts.showModal(modal);

                                    // event - once - interactionCreate
                                    client.once("interactionCreate", async (iModal) => {

                                        // isModalSubmit
                                        if (iModal.isModalSubmit()) {

                                            // modalAddProduct - modal
                                            if (iModal.customId == `modalAddProduct-${idPanel}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // info inserted - id product
                                                const infoInserted = iModal.fields.getTextInputValue(`newInfoText`)
                                                    .trim();

                                                // inserted product was not found in dbProducts (wio.db)
                                                if (!dbProducts.has(infoInserted)) {
                                                    await iModal.followUp({
                                                        content: `❌ | ID do produto: **${infoInserted}** não foi encontrado.`,
                                                        ephemeral: true
                                                    });
                                                    return;
                                                };

                                                // checks if the product already exists in the panel
                                                const checkProductPanel = await dbPanels.get(`${idPanel}.products.${infoInserted}`);
                                                if (checkProductPanel) {
                                                    await iModal.followUp({
                                                        content: `❌ | Este produto já está setado no painel.`,
                                                        ephemeral: true
                                                    });
                                                    return;
                                                };

                                                // checks if the number of products on the panel exceeds 20
                                                const panelProducts = await dbPanels.get(`${idPanel}.products`);
                                                if (Object.values(panelProducts).length == 20) {
                                                    await iModal.followUp({
                                                        content: `❌ | Não é possível adicionar mais de **20** produtos em um painel.`,
                                                        ephemeral: true
                                                    });
                                                    return;
                                                };

                                                // arrow the product to the panel by dbPanels (wio.db)
                                                await dbPanels.set(`${idPanel}.products.${infoInserted}.id`, infoInserted);
                                                await dbPanels.set(`${idPanel}.products.${infoInserted}.emoji`, `🛒`);

                                                // object values - items
                                                let allProducts = [];
                                                await Promise.all(
                                                    dbPanels.all().filter((panel) => panel.ID == idPanel)
                                                        .map(async (panel) => {

                                                            // get product ids
                                                            Object.keys(panel.data.products)
                                                                .map(async (product, index) => {

                                                                    // emoji - product
                                                                    const emojiP = await dbPanels.get(`${idPanel}.products.${product}.emoji`);

                                                                    // pulls the products in variable
                                                                    allProducts.push(`${emojiP} | **__${index + 1}°__** - 📦 | **ID:** ${product}`);
                                                                });

                                                        })
                                                );

                                                // embed panel products
                                                const embedPanelProducts = new EmbedBuilder()
                                                    .setTitle(`${client.user.username} | Produto(s)`)
                                                    .setDescription(allProducts.join(`\n`) || `Sem produtos. Adicione!`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Gerencie os produtos do painel utilizando as opções/botões abaixo.`, iconURL: client.user.avatarURL() });

                                                // message - edit
                                                await interaction.editReply({
                                                    embeds: [embedPanelProducts],
                                                    components: [rowPanelProducts1, rowPanelProducts2]
                                                });

                                                // message - success
                                                await iModal.followUp({
                                                    content: `✅ | Produto ID: **${infoInserted}** adicionado com sucesso ao painel.`,
                                                    ephemeral: true
                                                });

                                            };

                                        }

                                    });

                                };

                                // removeProduct - option
                                if (valueId == `removeProduct`) {

                                    // create the modal
                                    const modal = new ModalBuilder()
                                        .setCustomId(`modalRemoveProduct-${idPanel}`)
                                        .setTitle(`➕ | Remover Produto`);

                                    // creates the components for the modal
                                    const input = new TextInputBuilder()
                                        .setCustomId('newInfoText')
                                        .setLabel(`ID do Produto:`)
                                        .setMaxLength(28)
                                        .setPlaceholder(`Insira o ID do produto que será removido ...`)
                                        .setRequired(true)
                                        .setStyle(`Short`);

                                    // rows for components
                                    const iInput = new ActionRowBuilder()
                                        .addComponents(input);

                                    // add the rows to the modal
                                    await modal.addComponents(iInput);

                                    // open the modal
                                    await iPanelProducts.showModal(modal);

                                    // event - once - interactionCreate
                                    client.once("interactionCreate", async (iModal) => {

                                        // isModalSubmit
                                        if (iModal.isModalSubmit()) {

                                            // modalRemoveProduct - modal
                                            if (iModal.customId == `modalRemoveProduct-${idPanel}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // info inserted - id product
                                                const infoInserted = iModal.fields.getTextInputValue(`newInfoText`)
                                                    .trim();

                                                // inserted product was not found in dbProducts (wio.db)
                                                if (!dbProducts.has(infoInserted)) {
                                                    await iModal.followUp({
                                                        content: `❌ | ID do produto: **${infoInserted}** não foi encontrado.`,
                                                        ephemeral: true
                                                    });
                                                    return;
                                                };

                                                // checks if the product already exists in the panel
                                                const checkProductPanel = await dbPanels.get(`${idPanel}.products.${infoInserted}`);
                                                if (!checkProductPanel) {
                                                    await iModal.followUp({
                                                        content: `❌ | Este produto não está setado no painel.`,
                                                        ephemeral: true
                                                    });
                                                    return;
                                                };

                                                // remove the product to the panel by dbPanels (wio.db)
                                                await dbPanels.delete(`${idPanel}.products.${infoInserted}`)

                                                // object values - items
                                                let allProducts = [];
                                                await Promise.all(
                                                    dbPanels.all().filter((panel) => panel.ID == idPanel)
                                                        .map(async (panel) => {

                                                            // get product ids
                                                            Object.keys(panel.data.products)
                                                                .map(async (product, index) => {

                                                                    // emoji - product
                                                                    const emojiP = await dbPanels.get(`${idPanel}.products.${product}.emoji`);

                                                                    // pulls the products in variable
                                                                    allProducts.push(`${emojiP} | **__${index + 1}°__** - 📦 | **ID:** ${product}`);
                                                                });

                                                        })
                                                );

                                                // embed panel products
                                                const embedPanelProducts = new EmbedBuilder()
                                                    .setTitle(`${client.user.username} | Produto(s)`)
                                                    .setDescription(allProducts.join(`\n`) || `Sem produtos. Adicione!`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Gerencie os produtos do painel utilizando as opções/botões abaixo.`, iconURL: client.user.avatarURL() });

                                                // message - edit
                                                await interaction.editReply({
                                                    embeds: [embedPanelProducts],
                                                    components: [rowPanelProducts1, rowPanelProducts2]
                                                });

                                            };

                                        }

                                    });

                                };

                                // changeSequence - option
                                if (valueId == `changeSequence`) {

                                    // create the modal
                                    const modal = new ModalBuilder()
                                        .setCustomId(`modalSequenceProduct-${idPanel}`)
                                        .setTitle(`🔂 | Sequência`);

                                    // creates the components for the modal (1)
                                    const input1 = new TextInputBuilder()
                                        .setCustomId('newInfoText')
                                        .setLabel(`ID do Produto:`)
                                        .setMaxLength(28)
                                        .setPlaceholder(`Insira o ID do produto que será removido ...`)
                                        .setRequired(true)
                                        .setStyle(`Short`);

                                    // creates the components for the modal (2)
                                    const input2 = new TextInputBuilder()
                                        .setCustomId('newInfoText2')
                                        .setLabel(`Número da Posição:`)
                                        .setMaxLength(2)
                                        .setPlaceholder(`Insira o número da nova posição/linha ...\nExemplo: 2`)
                                        .setRequired(true)
                                        .setStyle(`Short`);

                                    // rows for components (1)
                                    const iInput1 = new ActionRowBuilder()
                                        .addComponents(input1);

                                    // rows for components (2)
                                    const iInput2 = new ActionRowBuilder()
                                        .addComponents(input2);

                                    // add the rows to the modal
                                    await modal.addComponents(iInput1, iInput2);

                                    // open the modal
                                    await iPanelProducts.showModal(modal);

                                    // event - once - interactionCreate
                                    client.once("interactionCreate", async (iModal) => {

                                        // isModalSubmit
                                        if (iModal.isModalSubmit()) {

                                            // modalSequenceProduct - modal
                                            if (iModal.customId == `modalSequenceProduct-${idPanel}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // info inserted - id product
                                                const infoInserted1 = iModal.fields.getTextInputValue(`newInfoText`)
                                                    .trim();

                                                // info inserted - num sequence
                                                const infoInserted2 = iModal.fields.getTextInputValue(`newInfoText2`)
                                                    .trim();

                                                // inserted product was not found in dbProducts (wio.db)
                                                if (!dbProducts.has(infoInserted1)) {
                                                    await iModal.followUp({
                                                        content: `❌ | ID do produto: **${infoInserted1}** não foi encontrado.`,
                                                        ephemeral: true
                                                    });
                                                    return;
                                                };

                                                // checks if the product already exists in the panel
                                                const checkProductPanel = await dbPanels.get(`${idPanel}.products.${infoInserted1}`);
                                                if (!checkProductPanel) {
                                                    await iModal.followUp({
                                                        content: `❌ | Este produto não está setado no painel.`,
                                                        ephemeral: true
                                                    });
                                                    return;
                                                };

                                                // number entered is not a valid number
                                                if (isNaN(infoInserted2)) {
                                                    await iModal.followUp({
                                                        content: `❌ | A posição inserida não é um número válido.`,
                                                        ephemeral: true
                                                    });
                                                    return;
                                                };

                                                // checks if the entered position is invalid
                                                const panelProducts = await dbPanels.get(`${idPanel}.products`);
                                                if (Number(infoInserted2) - 1 < 0 || Number(infoInserted2) - 1 >= Object.keys(panelProducts).length) {
                                                    await iModal.followUp({
                                                        content: `❌ | A posição inserida é inexistente.`,
                                                        ephemeral: true
                                                    });
                                                    return;
                                                };

                                                // get each product in dbPanels (wio.db)
                                                const keys = Object.keys(panelProducts);
                                                const currentProduct = panelProducts[infoInserted1];

                                                // removes the product from the current position without deleting it completely
                                                delete panelProducts[infoInserted1];

                                                // insert the product in the new desired position
                                                const reorderedProducts = {};
                                                let position = 0;
                                                for (const key of keys) {
                                                    if (position == Number(infoInserted2) - 1) {
                                                        reorderedProducts[infoInserted1] = currentProduct;
                                                    };
                                                    if (key != infoInserted1) {
                                                        reorderedProducts[key] = panelProducts[key];
                                                    };
                                                    position++;
                                                };

                                                // if the product is being moved to the last position
                                                if (Number(infoInserted2) - 1 == keys.length) {
                                                    reorderedProducts[infoInserted1] = currentProduct;
                                                };

                                                // defines the rearranged products in the panel
                                                await dbPanels.set(`${idPanel}.products`, reorderedProducts);

                                                // object values - items
                                                let allProducts = [];
                                                await Promise.all(
                                                    dbPanels.all().filter((panel) => panel.ID == idPanel)
                                                        .map(async (panel) => {

                                                            // get product ids
                                                            Object.keys(panel.data.products)
                                                                .map(async (product, index) => {

                                                                    // emoji - product
                                                                    const emojiP = await dbPanels.get(`${idPanel}.products.${product}.emoji`);

                                                                    // pulls the products in variable
                                                                    allProducts.push(`${emojiP} | **__${index + 1}°__** - 📦 | **ID:** ${product}`);
                                                                });

                                                        })
                                                );

                                                // embed panel products
                                                const embedPanelProducts = new EmbedBuilder()
                                                    .setTitle(`${client.user.username} | Produto(s)`)
                                                    .setDescription(allProducts.join(`\n`) || `Sem produtos. Adicione!`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Gerencie os produtos do painel utilizando as opções/botões abaixo.`, iconURL: client.user.avatarURL() });

                                                // message - edit
                                                await interaction.editReply({
                                                    embeds: [embedPanelProducts],
                                                    components: [rowPanelProducts1, rowPanelProducts2]
                                                });

                                            };

                                        };

                                    });

                                };

                                // changeEmoji - option
                                if (valueId == `changeEmoji`) {

                                    // create the modal
                                    const modal = new ModalBuilder()
                                        .setCustomId(`modalEmojiProduct-${idPanel}`)
                                        .setTitle(`🛠 | Emoji`);

                                    // creates the components for the modal
                                    const input = new TextInputBuilder()
                                        .setCustomId('newInfoText')
                                        .setLabel(`ID do Produto:`)
                                        .setMaxLength(28)
                                        .setPlaceholder(`Insira o ID do produto que será editado ...`)
                                        .setRequired(true)
                                        .setStyle(`Short`);

                                    // rows for components
                                    const iInput = new ActionRowBuilder()
                                        .addComponents(input);

                                    // add the rows to the modal
                                    await modal.addComponents(iInput);

                                    // open the modal
                                    await iPanelProducts.showModal(modal);

                                    // event - once - interactionCreate
                                    client.once("interactionCreate", async (iModal) => {

                                        // isModalSubmit
                                        if (iModal.isModalSubmit()) {

                                            // modalEmojiProduct - modal
                                            if (iModal.customId == `modalEmojiProduct-${idPanel}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // info inserted - id product
                                                const infoInserted = iModal.fields.getTextInputValue(`newInfoText`)
                                                    .trim();

                                                // inserted product was not found in dbProducts (wio.db)
                                                if (!dbProducts.has(infoInserted)) {
                                                    await iModal.followUp({
                                                        content: `❌ | ID do produto: **${infoInserted}** não foi encontrado.`,
                                                        ephemeral: true
                                                    });
                                                    return;
                                                };

                                                // checks if the product already exists in the panel
                                                const checkProductPanel = await dbPanels.get(`${idPanel}.products.${infoInserted}`);
                                                if (!checkProductPanel) {
                                                    await iModal.followUp({
                                                        content: `❌ | Este produto não está setado no painel.`,
                                                        ephemeral: true
                                                    });
                                                    return;
                                                };

                                                // message - edit
                                                const emojiP = await dbPanels.get(`${idPanel}.products.${infoInserted}.emoji`);
                                                await interaction.editReply({
                                                    embeds: [new EmbedBuilder()
                                                        .setTitle(`${client.user.username} | Novo Emoji`)
                                                        .setDescription(`Reaja a está mensagem com o novo emoji. (${emojiP})`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Você tem 2 minutos para reagir a está mensagem.` })
                                                    ],
                                                    components: [new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder()
                                                                .setCustomId(`cancelEditEmoji-${idPanel}`).setLabel(`Cancelar`).setEmoji(`❌`).setStyle(`Danger`)
                                                        )
                                                    ]
                                                }).then(async (msgEditEmoji) => {

                                                    // filter - reactions
                                                    const collectorFilter = (reaction, user) => {
                                                        return user.id == interaction.user.id;
                                                    };

                                                    // createReactionCollector - collector
                                                    const collectorEmoji = msgEditEmoji.createReactionCollector({
                                                        filter: collectorFilter,
                                                        max: 1,
                                                        time: 120000 // 2 minutos
                                                    });
                                                    collectorEmoji.on("collect", async (iReaction) => {

                                                        // remove todas as reações da mensagem
                                                        await msgEditEmoji.reactions.removeAll();

                                                        // emoji - name
                                                        const emojiName = iReaction.emoji.name;

                                                        // emoji - id
                                                        const emojiId = iReaction.emoji.id;

                                                        // checks if the emoji exists
                                                        const clientSearchEmoji = client.emojis.cache.find((emoji) => emoji.id == emojiId);
                                                        if (!clientSearchEmoji) {

                                                            // object values - items
                                                            let allProducts = [];
                                                            await Promise.all(
                                                                dbPanels.all().filter((panel) => panel.ID == idPanel)
                                                                    .map(async (panel) => {

                                                                        // get product ids
                                                                        Object.keys(panel.data.products)
                                                                            .map(async (product, index) => {

                                                                                // emoji - product
                                                                                const emojiP = await dbPanels.get(`${idPanel}.products.${product}.emoji`);

                                                                                // pulls the products in variable
                                                                                allProducts.push(`${emojiP} | **__${index + 1}°__** - 📦 | **ID:** ${product}`);
                                                                            });

                                                                    })
                                                            );

                                                            // embed panel products
                                                            const embedPanelProducts = new EmbedBuilder()
                                                                .setTitle(`${client.user.username} | Produto(s)`)
                                                                .setDescription(allProducts.join(`\n`) || `Sem produtos. Adicione!`)
                                                                .setColor(`NotQuiteBlack`)
                                                                .setFooter({ text: `Gerencie os produtos do painel utilizando as opções/botões abaixo.`, iconURL: client.user.avatarURL() });

                                                            // message - edit
                                                            await interaction.editReply({
                                                                embeds: [embedPanelProducts],
                                                                components: [rowPanelProducts1, rowPanelProducts2]
                                                            });

                                                            // message - error
                                                            await iModal.followUp({
                                                                content: `❌ | O emoji inserido não foi encontrado.`,
                                                                ephemeral: true
                                                            });

                                                            return;
                                                        };

                                                        // custom emoji - not animated
                                                        if (iReaction.emoji.animated == false) {

                                                            // arrow the new information to the panel by dbPanels (wio.db)
                                                            await dbPanels.set(`${idPanel}.products.${infoInserted}.emoji`, `<:${emojiName}:${emojiId}>`);

                                                        };

                                                        // custom emoji - animated
                                                        if (iReaction.emoji.animated == true) {

                                                            // arrow the new information to the panel by dbPanels (wio.db)
                                                            await dbPanels.set(`${idPanel}.products.${infoInserted}.emoji`, `<a:${emojiName}:${emojiId}>`);

                                                        };

                                                        // default emoji - discord
                                                        if (iReaction.emoji.animated == null || iReaction.emoji.animated == undefined) {

                                                            // arrow the new information to the panel by dbPanels (wio.db)
                                                            await dbPanels.set(`${idPanel}.products.${infoInserted}.emoji`, `${emojiName}`);

                                                        };

                                                        // object values - items
                                                        let allProducts = [];
                                                        await Promise.all(
                                                            dbPanels.all().filter((panel) => panel.ID == idPanel)
                                                                .map(async (panel) => {

                                                                    // get product ids
                                                                    Object.keys(panel.data.products)
                                                                        .map(async (product, index) => {

                                                                            // emoji - product
                                                                            const emojiP = await dbPanels.get(`${idPanel}.products.${product}.emoji`);

                                                                            // pulls the products in variable
                                                                            allProducts.push(`${emojiP} | **__${index + 1}°__** - 📦 | **ID:** ${product}`);
                                                                        });

                                                                })
                                                        );

                                                        // embed panel products
                                                        const embedPanelProducts = new EmbedBuilder()
                                                            .setTitle(`${client.user.username} | Produto(s)`)
                                                            .setDescription(allProducts.join(`\n`) || `Sem produtos. Adicione!`)
                                                            .setColor(`NotQuiteBlack`)
                                                            .setFooter({ text: `Gerencie os produtos do painel utilizando as opções/botões abaixo.`, iconURL: client.user.avatarURL() });

                                                        // message - edit
                                                        await interaction.editReply({
                                                            embeds: [embedPanelProducts],
                                                            components: [rowPanelProducts1, rowPanelProducts2]
                                                        });

                                                    });

                                                    // end of time - collector
                                                    collectorEmoji.on("end", async (c, r) => {
                                                        if (r == "time") {

                                                            // object values - items
                                                            let allProducts = [];
                                                            await Promise.all(
                                                                dbPanels.all().filter((panel) => panel.ID == idPanel)
                                                                    .map(async (panel) => {

                                                                        // get product ids
                                                                        Object.keys(panel.data.products)
                                                                            .map(async (product, index) => {

                                                                                // emoji - product
                                                                                const emojiP = await dbPanels.get(`${idPanel}.products.${product}.emoji`);

                                                                                // pulls the products in variable
                                                                                allProducts.push(`${emojiP} | **__${index + 1}°__** - 📦 | **ID:** ${product}`);
                                                                            });

                                                                    })
                                                            );

                                                            // embed panel products
                                                            const embedPanelProducts = new EmbedBuilder()
                                                                .setTitle(`${client.user.username} | Produto(s)`)
                                                                .setDescription(allProducts.join(`\n`) || `Sem produtos. Adicione!`)
                                                                .setColor(`NotQuiteBlack`)
                                                                .setFooter({ text: `Gerencie os produtos do painel utilizando as opções/botões abaixo.`, iconURL: client.user.avatarURL() });

                                                            // message - edit
                                                            await interaction.editReply({
                                                                embeds: [embedPanelProducts],
                                                                components: [rowPanelProducts1, rowPanelProducts2]
                                                            });

                                                        };
                                                    });

                                                    // try - catch
                                                    try {

                                                        // awaitMessageComponent - collector
                                                        const collectorFilter = (i) => i.user.id == interaction.user.id;
                                                        const iAwait = await msg.awaitMessageComponent({ filter: collectorFilter, time: 120000 });

                                                        // cancelEditEmoji - button
                                                        if (iAwait.customId == `cancelEditEmoji-${idPanel}`) {

                                                            // deferUpdate - postphone the update
                                                            await iAwait.deferUpdate();

                                                            // object values - items
                                                            let allProducts = [];
                                                            await Promise.all(
                                                                dbPanels.all().filter((panel) => panel.ID == idPanel)
                                                                    .map(async (panel) => {

                                                                        // get product ids
                                                                        Object.keys(panel.data.products)
                                                                            .map(async (product, index) => {

                                                                                // emoji - product
                                                                                const emojiP = await dbPanels.get(`${idPanel}.products.${product}.emoji`);

                                                                                // pulls the products in variable
                                                                                allProducts.push(`${emojiP} | **__${index + 1}°__** - 📦 | **ID:** ${product}`);
                                                                            });

                                                                    })
                                                            );

                                                            // embed panel products
                                                            const embedPanelProducts = new EmbedBuilder()
                                                                .setTitle(`${client.user.username} | Produto(s)`)
                                                                .setDescription(allProducts.join(`\n`) || `Sem produtos. Adicione!`)
                                                                .setColor(`NotQuiteBlack`)
                                                                .setFooter({ text: `Gerencie os produtos do painel utilizando as opções/botões abaixo.`, iconURL: client.user.avatarURL() });

                                                            // message - edit
                                                            await interaction.editReply({
                                                                embeds: [embedPanelProducts],
                                                                components: [rowPanelProducts1, rowPanelProducts2]
                                                            });

                                                            // stop the collector (collectorEmoji)
                                                            await collectorEmoji.stop();

                                                        };

                                                    } catch (err) {
                                                        return;
                                                    };

                                                });

                                            };

                                        }

                                    });

                                };

                            };

                            // previousPanelProducts - button
                            if (iPanelProducts.customId == `previousPanelProducts`) {

                                // deferUpdate - postphone the update
                                await iPanelProducts.deferUpdate();

                                // message - edit
                                await interaction.editReply({
                                    embeds: [embedPanel],
                                    components: [rowPanel]
                                });

                                // stop the collector
                                await collectorPanelProducts.stop();

                            };

                        });

                    });

                };

                // updateMsg - button
                if (iConfig.customId == `updateMsg`) {

                    // deferUpdate - postphone the update
                    await iConfig.deferUpdate();

                    // try catch
                    try {

                        // variables with message/channel ids by dbPanels (wio.db)
                        const channelId = await dbPanels.get(`${idPanel}.msgLocalization.channelId`);
                        const messageId = await dbPanels.get(`${idPanel}.msgLocalization.messageId`);

                        // message channel
                        const channelMsg = await client.channels.fetch(channelId);

                        // purchase message
                        const msgFetched = await channelMsg.messages.fetch(messageId);

                        // variables with panel embed information
                        const titleP = await dbPanels.get(`${idPanel}.embed.title`);
                        const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
                        const colorP = await dbPanels.get(`${idPanel}.embed.color`);
                        const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
                        const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
                        const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

                        // variables with panel select menu information
                        const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

                        // variable with the options for each product set on the panel
                        let allOptions = [];
                        let totalProducts = 0;

                        // maps the panel to format products in options
                        const allPanels = dbPanels.all()
                            .filter((panel) => panel.ID == idPanel);

                        // promise - products
                        await Promise.all(
                            allPanels.map(async (panel) => {

                                // get product ids
                                const productIds = Object.keys(panel.data.products);

                                // separates each product id
                                for (const pId of productIds) {

                                    // change the variable for the number of products in the panel
                                    totalProducts = productIds.length;

                                    // variables with product information by dbProducts (wio.db)
                                    const nameP = await dbProducts.get(`${pId}.name`);
                                    const priceP = await dbProducts.get(`${pId}.price`);
                                    const estoqueP = await dbProducts.get(`${pId}.stock`);

                                    // variables with product information by dbPanels (wio.db)
                                    const emojiP = await dbPanels.get(`${idPanel}.products.${pId}.emoji`);

                                    // pulls the products in option to the variable
                                    allOptions.push(
                                        {
                                            label: `${nameP}`,
                                            emoji: `${emojiP}`,
                                            description: `Preço: R$${Number(priceP).toFixed(2)} - Estoque: ${estoqueP.length}`,
                                            value: `${pId}`
                                        }
                                    );

                                };

                            }),
                        );

                        // checks if the panel has products
                        if (totalProducts < 1) {

                            // row panel
                            const rowPanel = new ActionRowBuilder()
                                .addComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId(panelId)
                                        .setPlaceholder(placeholderP)
                                        .setDisabled(true)
                                );

                            // embed panel
                            const embedPanel = new EmbedBuilder()
                                .setTitle(titleP)
                                .setDescription(descriptionP)
                                .setColor(colorP != "none" ? colorP : `NotQuiteBlack`)
                                .setThumbnail(thumbP != "none" ? thumbP : "https://sem-img.com")
                                .setImage(bannerP != "none" ? bannerP : "https://sem-img.com")
                                .setFooter({ text: footerP != "none" ? footerP : " " });

                            // message - edit
                            await msgFetched.edit({
                                embeds: [embedPanel],
                                components: [rowPanel]
                            });

                            return;
                        };

                        // row panel
                        const rowPanel = new ActionRowBuilder()
                            .addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId(idPanel)
                                    .setPlaceholder(placeholderP)
                                    .addOptions(allOptions)
                            );

                        // embed panel
                        const embedPanel = new EmbedBuilder()
                            .setTitle(titleP)
                            .setDescription(descriptionP)
                            .setColor(colorP != "none" ? colorP : `NotQuiteBlack`)
                            .setThumbnail(thumbP != "none" ? thumbP : "https://sem-img.com")
                            .setImage(bannerP != "none" ? bannerP : "https://sem-img.com")
                            .setFooter({ text: footerP != "none" ? footerP : " " });

                        // message - edit
                        await msgFetched.edit({
                            embeds: [embedPanel],
                            components: [rowPanel]
                        });

                        // editReply - success
                        await iConfig.followUp({
                            content: `✅ | Mensagem atualizada com sucesso no canal ${channelMsg}.`,
                            ephemeral: true
                        });

                    } catch (err) {

                        // channel/message does not exist or unknown error
                        if (err.code == 10003) {
                            await iConfig.followUp({
                                content: `❌ | Nenhum canal foi encontrado! Utilize **/set-painel** para setar sua mensagem de compra em um canal.`,
                                ephemeral: true
                            });

                        } else if (err.code == 10008) {
                            await iConfig.followUp({
                                content: `❌ | A mensagem não foi encontrada! Utilize **/set-painel** para setar a mensagem do seu painel.`,
                                ephemeral: true
                            });

                        } else if (err.code == 50035) {
                            await iConfig.followUp({
                                content: `❌ | Erro ao atualizar a mensagem. Confira os emojis dos produtos para garantir que estão configurados corretamente.`,
                                ephemeral: true
                            });

                        } else {
                            await iConfig.followUp({
                                content: `❌ | Ocorreu um erro desconhecido:\n\`\`\`js\n${err}\`\`\``,
                                ephemeral: true
                            });
                        };

                        return;
                    };

                };

                // deletePanel - button
                if (iConfig.customId == `deletePanel`) {

                    // create the modal
                    const modal = new ModalBuilder()
                        .setCustomId(`modalConfirm-${idPanel}`)
                        .setTitle(`📝 | ${idPanel}`)

                    // creates the components for the modal
                    const inputConfirm = new TextInputBuilder()
                        .setCustomId('confirmText')
                        .setLabel(`Escreva "SIM" para continuar:`)
                        .setMaxLength(3)
                        .setPlaceholder(`SIM`)
                        .setRequired(true)
                        .setStyle(`Paragraph`)

                    // rows for components
                    const iConfirm = new ActionRowBuilder().addComponents(inputConfirm);

                    // add the rows to the modal
                    modal.addComponents(iConfirm);

                    // open the modal
                    await iConfig.showModal(modal);

                    // event - interactionCreate
                    client.once("interactionCreate", async (iModal) => {

                        // modalLines - modal
                        if (iModal.customId == `modalConfirm-${idPanel}`) {

                            // deferUpdate - postphone the update
                            await iModal.deferUpdate();

                            // inserted text - confirm
                            const insertedText = iModal.fields.getTextInputValue(`confirmText`)
                                .toLowerCase();

                            // checks if confirmText is equal to "sim"
                            if (insertedText == `sim`) {

                                // delete the panel
                                await dbPanels.delete(idPanel);

                                // message - edit
                                await interaction.editReply({
                                    content: ``,
                                    embeds: [new EmbedBuilder()
                                        .setTitle(`${client.user.username} | Painel Excluido`)
                                        .setDescription(`✅ | Painel: **${idPanel}** deletado com sucesso.`)
                                        .setColor(`Green`)
                                    ],
                                    components: []
                                });

                                // stop the collector (collectorConfig)
                                await collectorConfig.stop();

                            };

                        };

                    });

                };

            });

            // end of time - collector
            collectorConfig.on("end", async (c, r) => {
                if (r == "time") {

                    // message - edit
                    await interaction.editReply({
                        content: `⚙ | Use o comando novamente.`,
                        embeds: [],
                        components: []
                    });

                };
            });

        });

    },
};