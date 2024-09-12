// discord.js
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, AttachmentBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// fs - files
const fs = require("node:fs");

// url
const url = require("node:url");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const dbPanels = new JsonDatabase({ databasePath: "./databases/dbPanels.json" });
const dbProducts = new JsonDatabase({ databasePath: "./databases/dbProducts.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("config")
        .setDescription("[🛠/💰] Configure um produto!")
        .addStringOption(opString => opString
            .setName("id")
            .setDescription("ID do Produto")
            .setMaxLength(25)
            .setAutocomplete(true)
            .setRequired(true)
        )
        .setDMPermission(false),

    // autocomplete
    async autocomplete(interaction) {

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

        // pull all products into dbProducts (wio.db)
        for (const product of dbProducts.all()) {
            choices.push({
                name: `ID: ${product.ID} | Nome: ${product.data.name}`,
                value: product.ID,
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

        // id product
        const idProduct = interaction.options.getString("id");

        // inserted product was not found in dbProducts (wio.db)
        if (!dbProducts.has(idProduct)) {
            await interaction.reply({
                content: `❌ | ID do produto: **${idProduct}** não foi encontrado.`,
                ephemeral: true
            });
            return;
        };

        // variables with product information
        const nameP = await dbProducts.get(`${idProduct}.name`);
        const descriptionP = await dbProducts.get(`${idProduct}.description`);
        const priceP = await dbProducts.get(`${idProduct}.price`);
        const estoqueP = await dbProducts.get(`${idProduct}.stock`);

        // row product - button (1)
        const rowProduct1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`changeName`).setLabel(`Alterar Nome`).setEmoji(`🌎`).setStyle(`Primary`),
                new ButtonBuilder().setCustomId(`changePrice`).setLabel(`Alterar Preço`).setEmoji(`💸`).setStyle(`Primary`),
                new ButtonBuilder().setCustomId(`changeDescription`).setLabel(`Alterar Descrição`).setEmoji(`📜`).setStyle(`Primary`),
                new ButtonBuilder().setCustomId(`configStock`).setLabel(`Configurar Estoque`).setEmoji(`📦`).setStyle(`Primary`)
            );

        // row product - button (2)
        const rowProduct2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`advancedConfigs`).setLabel(`Configurações Avançadas`).setEmoji(`🔧`).setStyle(`Primary`),
                new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                new ButtonBuilder().setCustomId(`deleteProduct`).setLabel(`DELETAR`).setEmoji(`🗑`).setStyle(`Danger`),
                new ButtonBuilder().setCustomId(`infoProduct`).setEmoji(`📝`).setStyle(`Primary`)
            );

        // embed product
        const embedProduct = new EmbedBuilder()
            .setTitle(`${client.user.username} | Configurando Produto`)
            .setDescription(`**📜 | Descrição:\n\`\`\`${descriptionP}\`\`\`\n📝 | ID: \`${idProduct}\`\n🌎 | Nome: \`${nameP}\`\n💸 | Preço: \`R$${Number(priceP).toFixed(2)}\`\n📦 | Estoque: \`${estoqueP.length}\`**`)
            .setColor(`NotQuiteBlack`)
            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

        // message - send
        await interaction.reply({
            embeds: [embedProduct],
            components: [rowProduct1, rowProduct2]
        }).then(async (msg) => {

            // createMessageComponentCollector - collector
            const filter = (m) => m.user.id == interaction.user.id;
            const collectorConfig = msg.createMessageComponentCollector({
                filter: filter,
                time: 600000
            });
            collectorConfig.on("collect", async (iConfig) => {

                // channel - config
                const channel = iConfig.channel;

                // changeName - button
                if (iConfig.customId == `changeName`) {

                    // deferUpdate - postphone the update
                    await iConfig.deferUpdate();

                    // variables with product information
                    const nameP = await dbProducts.get(`${idProduct}.name`);

                    // message - edit
                    await msg.edit({
                        embeds: [new EmbedBuilder()
                            .setTitle(`${client.user.username} | Nome`)
                            .setDescription(`Envie o nome que será utilizado! \`(${nameP})\``)
                            .setFooter({ text: `Você tem 2 minutos para enviar.` })
                            .setColor(`NotQuiteBlack`)
                        ],
                        components: []
                    });

                    // createMessageCollector - collector
                    const collectorMsg = channel.createMessageCollector({
                        filter: (m) => m.author.id == interaction.user.id,
                        max: 1,
                        time: 120000 // 2 minutes
                    });
                    collectorMsg.on("collect", async (iMsg) => {

                        // delete the message (iMsg)
                        await iMsg.delete();

                        // message (trim)
                        const msgContent = iMsg.content
                            .trim()
                            .replace(/[*_~`]|^>+/g, ``);

                        // text exceeds letters
                        if (msgContent.length > 38) {

                            // variables with product information
                            const nameP = await dbProducts.get(`${idProduct}.name`);
                            const descriptionP = await dbProducts.get(`${idProduct}.description`);
                            const priceP = await dbProducts.get(`${idProduct}.price`);
                            const estoqueP = await dbProducts.get(`${idProduct}.stock`);

                            // embed product
                            const embedProduct = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Configurando Produto`)
                                .setDescription(`**📜 | Descrição:\n\`\`\`${descriptionP}\`\`\`\n📝 | ID: \`${idProduct}\`\n🌎 | Nome: \`${nameP}\`\n💸 | Preço: \`R$${Number(priceP).toFixed(2)}\`\n📦 | Estoque: \`${estoqueP.length}\`**`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                            // message - edit
                            await msg.edit({
                                embeds: [embedProduct],
                                components: [rowProduct1, rowProduct2]
                            });

                            // message - error
                            await iConfig.followUp({
                                content: `❌ | Limite de 38 caracteres excedido.`,
                                ephemeral: true
                            });

                            return;
                        };

                        // set the new information in dbProducts (wio.db)
                        await dbProducts.set(`${idProduct}.name`, msgContent);

                        // variables with product information
                        const nameP = await dbProducts.get(`${idProduct}.name`);
                        const descriptionP = await dbProducts.get(`${idProduct}.description`);
                        const priceP = await dbProducts.get(`${idProduct}.price`);
                        const estoqueP = await dbProducts.get(`${idProduct}.stock`);

                        // embed product
                        const embedProduct = new EmbedBuilder()
                            .setTitle(`${client.user.username} | Configurando Estoque`)
                            .setDescription(`**📜 | Descrição:\n\`\`\`${descriptionP}\`\`\`\n📝 | ID: \`${idProduct}\`\n🌎 | Nome: \`${nameP}\`\n💸 | Preço: \`R$${Number(priceP).toFixed(2)}\`\n📦 | Estoque: \`${estoqueP.length}\`**`)
                            .setColor(`NotQuiteBlack`)
                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                        // message - edit
                        await msg.edit({
                            embeds: [embedProduct],
                            components: [rowProduct1, rowProduct2]
                        });

                    });

                    // end of time - collector (collectorMsg)
                    collectorMsg.on("end", async (c, r) => {
                        if (r == "time") {

                            // variables with product information
                            const nameP = await dbProducts.get(`${idProduct}.name`);
                            const descriptionP = await dbProducts.get(`${idProduct}.description`);
                            const priceP = await dbProducts.get(`${idProduct}.price`);
                            const estoqueP = await dbProducts.get(`${idProduct}.stock`);

                            // embed product
                            const embedProduct = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Configurando Produto`)
                                .setDescription(`**📜 | Descrição:\n\`\`\`${descriptionP}\`\`\`\n📝 | ID: \`${idProduct}\`\n🌎 | Nome: \`${nameP}\`\n💸 | Preço: \`R$${Number(priceP).toFixed(2)}\`\n📦 | Estoque: \`${estoqueP.length}\`**`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                            // message - edit
                            await msg.edit({
                                embeds: [embedProduct],
                                components: [rowProduct1, rowProduct2]
                            });

                        };
                    });

                };

                // changePrice - button
                if (iConfig.customId == `changePrice`) {

                    // deferUpdate - postphone the update
                    await iConfig.deferUpdate();

                    // variables with product information
                    const priceP = await dbProducts.get(`${idProduct}.price`);

                    // message - edit
                    await msg.edit({
                        embeds: [new EmbedBuilder()
                            .setTitle(`${client.user.username} | Preço`)
                            .setDescription(`Envie o preço que será utilizado! \`(R$${Number(priceP).toFixed(2)})\``)
                            .setFooter({ text: `Você tem 2 minutos para enviar.` })
                            .setColor(`NotQuiteBlack`)
                        ],
                        components: []
                    });

                    // createMessageCollector - collector
                    const collectorMsg = channel.createMessageCollector({
                        filter: (m) => m.author.id == interaction.user.id,
                        max: 1,
                        time: 120000 // 2 minutes
                    });
                    collectorMsg.on("collect", async (iMsg) => {

                        // delete the message (iMsg)
                        await iMsg.delete();

                        // message (trim)
                        const msgContent = iMsg.content
                            .trim()
                            .replace(`R$`, ``);

                        // invalid price
                        const priceRegex = /^\d+(\.\d{1,2})?$/;
                        if (!priceRegex.test(msgContent)) {

                            // variables with product information
                            const nameP = await dbProducts.get(`${idProduct}.name`);
                            const descriptionP = await dbProducts.get(`${idProduct}.description`);
                            const priceP = await dbProducts.get(`${idProduct}.price`);
                            const estoqueP = await dbProducts.get(`${idProduct}.stock`);

                            // embed product
                            const embedProduct = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Configurando Produto`)
                                .setDescription(`**📜 | Descrição:\n\`\`\`${descriptionP}\`\`\`\n📝 | ID: \`${idProduct}\`\n🌎 | Nome: \`${nameP}\`\n💸 | Preço: \`R$${Number(priceP).toFixed(2)}\`\n📦 | Estoque: \`${estoqueP.length}\`**`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                            // message - edit
                            await msg.edit({
                                embeds: [embedProduct],
                                components: [rowProduct1, rowProduct2]
                            });

                            // message - error
                            await iConfig.followUp({
                                content: `❌ | O preço inserido é inválido.`,
                                ephemeral: true
                            });

                            return;
                        };

                        // set the new information in dbProducts (wio.db)
                        await dbProducts.set(`${idProduct}.price`, msgContent);

                        // variables with product information
                        const nameP = await dbProducts.get(`${idProduct}.name`);
                        const descriptionP = await dbProducts.get(`${idProduct}.description`);
                        const priceP = await dbProducts.get(`${idProduct}.price`);
                        const estoqueP = await dbProducts.get(`${idProduct}.stock`);

                        // embed product
                        const embedProduct = new EmbedBuilder()
                            .setTitle(`${client.user.username} | Configurando Produto`)
                            .setDescription(`**📜 | Descrição:\n\`\`\`${descriptionP}\`\`\`\n📝 | ID: \`${idProduct}\`\n🌎 | Nome: \`${nameP}\`\n💸 | Preço: \`R$${Number(priceP).toFixed(2)}\`\n📦 | Estoque: \`${estoqueP.length}\`**`)
                            .setColor(`NotQuiteBlack`)
                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                        // message - edit
                        await msg.edit({
                            embeds: [embedProduct],
                            components: [rowProduct1, rowProduct2]
                        });

                    });

                    // end of time - collector (collectorMsg)
                    collectorMsg.on("end", async (c, r) => {
                        if (r == "time") {

                            // variables with product information
                            const nameP = await dbProducts.get(`${idProduct}.name`);
                            const descriptionP = await dbProducts.get(`${idProduct}.description`);
                            const priceP = await dbProducts.get(`${idProduct}.price`);
                            const estoqueP = await dbProducts.get(`${idProduct}.stock`);

                            // embed product
                            const embedProduct = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Configurando Produto`)
                                .setDescription(`**📜 | Descrição:\n\`\`\`${descriptionP}\`\`\`\n📝 | ID: \`${idProduct}\`\n🌎 | Nome: \`${nameP}\`\n💸 | Preço: \`R$${Number(priceP).toFixed(2)}\`\n📦 | Estoque: \`${estoqueP.length}\`**`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                            // message - edit
                            await msg.edit({
                                embeds: [embedProduct],
                                components: [rowProduct1, rowProduct2]
                            });

                        };
                    });

                };

                // changeDescription - button
                if (iConfig.customId == `changeDescription`) {

                    // deferUpdate - postphone the update
                    await iConfig.deferUpdate();

                    // variables with product information
                    const descriptionP = await dbProducts.get(`${idProduct}.description`);

                    // message - edit
                    await msg.edit({
                        embeds: [new EmbedBuilder()
                            .setTitle(`${client.user.username} | Descrição`)
                            .setDescription(`Envie a descrição que será utilizada!\n\`\`\`${descriptionP}\`\`\``)
                            .setFooter({ text: `Você tem 2 minutos para enviar.` })
                            .setColor(`NotQuiteBlack`)
                        ],
                        components: []
                    });

                    // createMessageCollector - collector
                    const collectorMsg = channel.createMessageCollector({
                        filter: (m) => m.author.id == interaction.user.id,
                        max: 1,
                        time: 120000 // 2 minutes
                    });
                    collectorMsg.on("collect", async (iMsg) => {

                        // delete the message (iMsg)
                        await iMsg.delete();

                        // message (trim)
                        const msgContent = iMsg.content
                            .trim()
                            .replace(/[*_~`]|^>+/g, ``);

                        // text exceeds 28 letters
                        if (msgContent.length > 2800) {

                            // variables with product information
                            const nameP = await dbProducts.get(`${idProduct}.name`);
                            const descriptionP = await dbProducts.get(`${idProduct}.description`);
                            const priceP = await dbProducts.get(`${idProduct}.price`);
                            const estoqueP = await dbProducts.get(`${idProduct}.stock`);

                            // embed product
                            const embedProduct = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Configurando Produto`)
                                .setDescription(`**📜 | Descrição:\n\`\`\`${descriptionP}\`\`\`\n📝 | ID: \`${idProduct}\`\n🌎 | Nome: \`${nameP}\`\n💸 | Preço: \`R$${Number(priceP).toFixed(2)}\`\n📦 | Estoque: \`${estoqueP.length}\`**`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                            // message - edit
                            await msg.edit({
                                embeds: [embedProduct],
                                components: [rowProduct1, rowProduct2]
                            });

                            // message - error
                            await iConfig.followUp({
                                content: `❌ | Limite de 2800 caracteres excedido.`,
                                ephemeral: true
                            });

                            return;
                        };

                        // set the new information in dbProducts (wio.db)
                        await dbProducts.set(`${idProduct}.description`, msgContent);

                        // variables with product information
                        const nameP = await dbProducts.get(`${idProduct}.name`);
                        const descriptionP = await dbProducts.get(`${idProduct}.description`);
                        const priceP = await dbProducts.get(`${idProduct}.price`);
                        const estoqueP = await dbProducts.get(`${idProduct}.stock`);

                        // embed product
                        const embedProduct = new EmbedBuilder()
                            .setTitle(`${client.user.username} | Configurando Produto`)
                            .setDescription(`**📜 | Descrição:\n\`\`\`${descriptionP}\`\`\`\n📝 | ID: \`${idProduct}\`\n🌎 | Nome: \`${nameP}\`\n💸 | Preço: \`R$${Number(priceP).toFixed(2)}\`\n📦 | Estoque: \`${estoqueP.length}\`**`)
                            .setColor(`NotQuiteBlack`)
                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                        // message - edit
                        await msg.edit({
                            embeds: [embedProduct],
                            components: [rowProduct1, rowProduct2]
                        });

                    });

                    // end of time - collector (collectorMsg)
                    collectorMsg.on("end", async (c, r) => {
                        if (r == "time") {

                            // variables with product information
                            const nameP = await dbProducts.get(`${idProduct}.name`);
                            const descriptionP = await dbProducts.get(`${idProduct}.description`);
                            const priceP = await dbProducts.get(`${idProduct}.price`);
                            const estoqueP = await dbProducts.get(`${idProduct}.stock`);

                            // embed product
                            const embedProduct = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Configurando Produto`)
                                .setDescription(`**📜 | Descrição:\n\`\`\`${descriptionP}\`\`\`\n📝 | ID: \`${idProduct}\`\n🌎 | Nome: \`${nameP}\`\n💸 | Preço: \`R$${Number(priceP).toFixed(2)}\`\n📦 | Estoque: \`${estoqueP.length}\`**`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                            // message - edit
                            await msg.edit({
                                embeds: [embedProduct],
                                components: [rowProduct1, rowProduct2]
                            });

                        };
                    });

                };

                // configStock - button
                if (iConfig.customId == `configStock`) {

                    // deferUpdate - postphone the update
                    await iConfig.deferUpdate();

                    // row stock - select menu (1)
                    const rowStock1 = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder().setCustomId(`changesStock`).setPlaceholder(`Selecione uma opção (Estoque)`)
                                .setOptions(
                                    new StringSelectMenuOptionBuilder().setLabel(`Adicionar`).setEmoji(`➕`).setDescription(`Adicione estoque em seu produto.`).setValue(`addStock`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Remover`).setEmoji(`➖`).setDescription(`Remova estoque do seu produto.`).setValue(`removeStock`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Backup`).setEmoji(`💾`).setDescription(`Faça backup do estoque.`).setValue(`backupStock`)
                                )
                        );

                    // row stock - button (2)
                    const rowStock2 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`clearStock`).setLabel(`LIMPAR`).setEmoji(`🗑`).setStyle(`Danger`),
                            new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`previousPageStock`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                        );

                    // checks if the number of items in stock exceeds 50
                    const estoqueP = await dbProducts.get(`${idProduct}.stock`);
                    if (estoqueP.length <= 25) {

                        // embed stock
                        const embedStock = new EmbedBuilder()

                        // formatted stock
                        let formattedStock = estoqueP
                            .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                            .join("\n") || "Sem estoque, Adicione."

                        // checks if messages with stock items exceed 4096 characters (1)
                        // and limits it to 10 items (1)
                        if (formattedStock.length > 4000) {

                            // set items with a limit of 10 in the variable
                            formattedStock = estoqueP
                                .slice(0, 1)
                                .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                .join("\n") || "Sem estoque, Adicione."

                            // arrow the information in the embed stock
                            embedStock
                                .setTitle(`${client.user.username} | Configurando Estoque`)
                                .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `Existem mais itens no total, faça um backup para ver o estoque completo.`, iconURL: client.user.avatarURL() });

                        } else {

                            // arrow the information in the embed stock
                            embedStock
                                .setTitle(`${client.user.username} | Configurando Estoque`)
                                .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `Este é seu estoque completo.`, iconURL: client.user.avatarURL() });

                        };

                        // message - edit
                        await msg.edit({
                            embeds: [embedStock],
                            components: [rowStock1, rowStock2]
                        });

                    } else {

                        // formatted stock
                        let formattedStock = estoqueP
                            .slice(0, 25)
                            .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                            .join("\n") || "Sem estoque, Adicione."

                        // checks if messages with stock items exceed 4096 characters
                        // and limits it to 10 items
                        if (formattedStock.length > 4000) {

                            // set items with a limit of 10 in the variable
                            formattedStock = estoqueP
                                .slice(0, 10)
                                .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                .join("\n") || "Sem estoque, Adicione."

                        };

                        // embed stock
                        const embedStock = new EmbedBuilder()
                            .setTitle(`${client.user.username} | Configurando Estoque`)
                            .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                            .setColor(`NotQuiteBlack`)
                            .setFooter({ text: `Existem mais itens no total, faça um backup para ver o estoque completo.`, iconURL: client.user.avatarURL() })

                        // message - edit
                        await msg.edit({
                            embeds: [embedStock],
                            components: [rowStock1, rowStock2]
                        });

                    };

                    // createMessageComponentCollector - collector
                    const filter = (m) => m.user.id == interaction.user.id;
                    const collectorConfigStock = msg.createMessageComponentCollector({
                        filter: filter,
                        time: 600000
                    });
                    collectorConfigStock.on("collect", async (iConfigStock) => {

                        // changesStock - select menu
                        if (iConfigStock.customId == `changesStock`) {

                            // edit the message and remove the selected option
                            await msg.edit({
                                components: [rowStock1, rowStock2]
                            });

                            // value id
                            const valueId = iConfigStock.values[0];

                            // addStock - option
                            if (valueId == `addStock`) {

                                // deferUpdate - postphone the update
                                await iConfigStock.deferUpdate();

                                // row stock add - button
                                const rowStockAdd = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`addByLine`).setLabel(`ADICIONAR POR LINHA`).setEmoji(`📜`).setStyle(`Success`),
                                        new ButtonBuilder().setCustomId(`addOneByOne`).setLabel(`ADICIONAR UM POR UM`).setEmoji(`➕`).setStyle(`Primary`),
                                        new ButtonBuilder().setCustomId(`previousPageStockAdd`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                    );

                                // embed stock add
                                const embedStockadd = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Estoque`)
                                    .setDescription(`🔎 | Prefere adicionar vários produtos por linha ou enviar um por um?`)
                                    .setColor(`NotQuiteBlack`)

                                // message - edit
                                await msg.edit({
                                    embeds: [embedStockadd],
                                    components: [rowStockAdd]
                                });

                                // createMessageComponentCollector - collector
                                const filter = (m) => m.user.id == interaction.user.id;
                                const collectorConfigStockAdd = msg.createMessageComponentCollector({
                                    filter: filter,
                                    time: 600000
                                });
                                collectorConfigStockAdd.on("collect", async (iStockAdd) => {

                                    // addByLine- button
                                    if (iStockAdd.customId == `addByLine`) {

                                        // variables with product information
                                        const nameP = await dbProducts.get(`${idProduct}.name`);

                                        // create the modal
                                        const modal = new ModalBuilder()
                                            .setCustomId(`modalLines-${idProduct}`)
                                            .setTitle(`📦 | ${nameP}`)

                                        // creates the components for the modal
                                        const inputLines = new TextInputBuilder()
                                            .setCustomId('linesStock')
                                            .setLabel(`Adicione os itens por linha:`)
                                            .setMaxLength(2500)
                                            .setPlaceholder(`Exemplo:\nitem1\nitem2\nitem3`)
                                            .setRequired(true)
                                            .setStyle(`Paragraph`)

                                        // rows for components
                                        const iLinesStock = new ActionRowBuilder().addComponents(inputLines);

                                        // add the rows to the modal
                                        modal.addComponents(iLinesStock);

                                        // open the modal
                                        await iStockAdd.showModal(modal);

                                        // event - interactionCreate
                                        client.once("interactionCreate", async (iModal) => {

                                            // modalLines - modal
                                            if (iModal.customId == `modalLines-${idProduct}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // stock variable before replenishment
                                                const estoqueLength = await dbProducts.get(`${idProduct}.stock`).length;

                                                // inserted lines - stock
                                                const insertedLines = iModal.fields.getTextInputValue(`linesStock`);

                                                // adds stock to dbProducts with the items inserted per line (wio.db)
                                                const addedLines = insertedLines.split(`\n`);
                                                for (let i = 0; i < addedLines.length; i++) {
                                                    await dbProducts.push(`${idProduct}.stock`, addedLines[i]);
                                                };

                                                // checks if the number of items in stock exceeds 50
                                                const estoqueP = await dbProducts.get(`${idProduct}.stock`);
                                                if (estoqueP.length <= 25) {

                                                    // embed stock
                                                    const embedStock = new EmbedBuilder()

                                                    // formatted stock
                                                    let formattedStock = estoqueP
                                                        .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                        .join("\n") || "Sem estoque, Adicione."

                                                    // checks if messages with stock items exceed 4096 characters
                                                    // and limits it to 10 items
                                                    if (formattedStock.length > 4096) {

                                                        // set items with a limit of 10 in the variable
                                                        formattedStock = estoqueP
                                                            .slice(0, 10)
                                                            .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                            .join("\n") || "Sem estoque, Adicione."

                                                        // arrow the information in the embed stock
                                                        embedStock
                                                            .setTitle(`${client.user.username} | Configurando Estoque`)
                                                            .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                            .setColor(`NotQuiteBlack`)
                                                            .setFooter({ text: `Existem mais itens no total, faça um backup para ver o estoque completo.`, iconURL: client.user.avatarURL() })

                                                    } else {

                                                        // arrow the information in the embed stock
                                                        embedStock
                                                            .setTitle(`${client.user.username} | Configurando Estoque`)
                                                            .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                            .setColor(`NotQuiteBlack`)
                                                            .setFooter({ text: `Este é seu estoque completo.`, iconURL: client.user.avatarURL() })

                                                    };

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedStock],
                                                        components: [rowStock1, rowStock2]
                                                    });

                                                } else {

                                                    // formatted stock
                                                    let formattedStock = estoqueP
                                                        .slice(0, 25)
                                                        .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                        .join("\n") || "Sem estoque, Adicione."

                                                    // checks if messages with stock items exceed 4096 characters
                                                    // and limits it to 10 items
                                                    if (formattedStock.length > 4096) {

                                                        // set items with a limit of 10 in the variable
                                                        formattedStock = estoqueP
                                                            .slice(0, 10)
                                                            .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                            .join("\n") || "Sem estoque, Adicione."

                                                    };

                                                    // embed stock
                                                    const embedStock = new EmbedBuilder()
                                                        .setTitle(`${client.user.username} | Configurando Estoque`)
                                                        .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Existem mais itens no total, faça um backup para ver o estoque completo.`, iconURL: client.user.avatarURL() })

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedStock],
                                                        components: [rowStock1, rowStock2]
                                                    });

                                                };

                                                // checks whether the previous amount of items in stock was zero
                                                if (estoqueLength == 0) {

                                                    // variable of users who have product notifications activated
                                                    const allNotificationUsers = dbProducts.all()
                                                        .filter((productId) => productId.ID == idProduct);

                                                    // iterates over all products in the database
                                                    for (const product of allNotificationUsers) {

                                                        // checks if there are notification users for the product
                                                        const notificationUsers = product.data.notificationUsers;
                                                        if (notificationUsers) {

                                                            // separates the id of each user
                                                            const userIds = Object.keys(notificationUsers);
                                                            for (const userId of userIds) {

                                                                // search for each user with fetch
                                                                const userFetch = await client.users.fetch(userId);

                                                                // variables with product information
                                                                const nameP = await dbProducts.get(`${idProduct}.name`);
                                                                const channelP = await dbProducts.get(`${idProduct}.msgLocalization.channelId`);

                                                                // channel - fetch
                                                                const channelFetch = await iModal.guild.channels.cache.get(channelP);

                                                                // attempts to send a message to the user's DM
                                                                // informing them of new stock on the product
                                                                await userFetch.send({
                                                                    embeds: [new EmbedBuilder()
                                                                        .setTitle(`${client.user.username} | Notificação`)
                                                                        .setDescription(`🔔 | O estoque do produto: **${nameP}** foi reabastecido com \`${addedLines.length}\` itens.\n\n🛒 | O produto se encontra no canal: ${channelFetch || `**Não encontrado**`}.`)
                                                                        .setColor(`NotQuiteBlack`)
                                                                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })
                                                                    ]
                                                                }).catch((err) => {
                                                                    return;
                                                                });

                                                            };

                                                        };

                                                    };

                                                };

                                                // message - success
                                                await iModal.followUp({
                                                    content: `✅ | Foram adicionados \`${addedLines.length}\` itens em seu estoque.`,
                                                    ephemeral: true
                                                });

                                                // stop the collector (collectorConfigStockAdd)
                                                await collectorConfigStockAdd.stop();

                                            };

                                        });

                                    };

                                    // addOneByOne - button
                                    if (iStockAdd.customId == `addOneByOne`) {

                                        // deferUpdate - postphone the update
                                        await iStockAdd.deferUpdate();

                                        // stock variable before replenishment
                                        const estoqueLength = await dbProducts.get(`${idProduct}.stock`).length;

                                        // message - edit
                                        await msg.edit({
                                            embeds: [new EmbedBuilder()
                                                .setTitle(`${client.user.username} | Configurando Estoque`)
                                                .setDescription(`Envie os produtos um por um e, ao concluir, pressione o botão abaixo.`)
                                                .setFooter({ text: `Você tem 2 minutos para enviar.` })
                                                .setColor(`NotQuiteBlack`)
                                            ],
                                            components: [new ActionRowBuilder()
                                                .addComponents(
                                                    new ButtonBuilder().setCustomId(`finalizeItems-${idProduct}`).setLabel(`Finalizar`).setEmoji(`📦`).setStyle(`Success`)
                                                )
                                            ]
                                        });

                                        // added items - variable
                                        let addedItems = 0;

                                        // createMessageCollector - collector
                                        const collectorMsg = channel.createMessageCollector({
                                            filter: (m) => m.author.id == interaction.user.id
                                        });
                                        collectorMsg.on("collect", async (iMsg) => {

                                            // delete the message (iMsg)
                                            await iMsg.delete();

                                            // message (trim)
                                            const msgContent = iMsg.content.trim();

                                            // adds stock to dbProducts with the items sent one by one (wio.db)
                                            await dbProducts.push(`${idProduct}.stock`, msgContent);

                                            // added one number to variable (addedItems)
                                            addedItems++;

                                        });

                                        // event - interactionCreate
                                        client.once("interactionCreate", async (iButton) => {

                                            // finalizeItems - button
                                            if (iButton.customId == `finalizeItems-${idProduct}`) {

                                                // deferUpdate - postphone the update
                                                await iButton.deferUpdate();

                                                // stop the collector (collectorMsg)
                                                await collectorMsg.stop();

                                                // checks if the number of items in stock exceeds 50
                                                const estoqueP = await dbProducts.get(`${idProduct}.stock`);
                                                if (estoqueP.length <= 25) {

                                                    // embed stock
                                                    const embedStock = new EmbedBuilder()

                                                    // formatted stock
                                                    let formattedStock = estoqueP
                                                        .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                        .join("\n") || "Sem estoque, Adicione."

                                                    // checks if messages with stock items exceed 4096 characters
                                                    // and limits it to 10 items
                                                    if (formattedStock.length > 4096) {

                                                        // set items with a limit of 10 in the variable
                                                        formattedStock = estoqueP
                                                            .slice(0, 10)
                                                            .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                            .join("\n") || "Sem estoque, Adicione."

                                                        // arrow the information in the embed stock
                                                        embedStock
                                                            .setTitle(`${client.user.username} | Configurando Estoque`)
                                                            .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                            .setColor(`NotQuiteBlack`)
                                                            .setFooter({ text: `Existem mais itens no total, faça um backup para ver o estoque completo.`, iconURL: client.user.avatarURL() })

                                                    } else {

                                                        // arrow the information in the embed stock
                                                        embedStock
                                                            .setTitle(`${client.user.username} | Configurando Estoque`)
                                                            .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                            .setColor(`NotQuiteBlack`)
                                                            .setFooter({ text: `Este é seu estoque completo.`, iconURL: client.user.avatarURL() })

                                                    };

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedStock],
                                                        components: [rowStock1, rowStock2]
                                                    });

                                                } else {

                                                    // formatted stock
                                                    let formattedStock = estoqueP
                                                        .slice(0, 25)
                                                        .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                        .join("\n") || "Sem estoque, Adicione."

                                                    // checks if messages with stock items exceed 4096 characters
                                                    // and limits it to 10 items
                                                    if (formattedStock.length > 4096) {

                                                        // set items with a limit of 10 in the variable
                                                        formattedStock = estoqueP
                                                            .slice(0, 10)
                                                            .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                            .join("\n") || "Sem estoque, Adicione."

                                                    };

                                                    // embed stock
                                                    const embedStock = new EmbedBuilder()
                                                        .setTitle(`${client.user.username} | Configurando Estoque`)
                                                        .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Existem mais itens no total, faça um backup para ver o estoque completo.`, iconURL: client.user.avatarURL() })

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedStock],
                                                        components: [rowStock1, rowStock2]
                                                    });

                                                };

                                                // checks whether the previous amount of items in stock was zero
                                                if (estoqueLength == 0) {

                                                    // variable of users who have product notifications activated
                                                    const allNotificationUsers = dbProducts.all()
                                                        .filter((productId) => productId.ID == idProduct);

                                                    // iterates over all products in the database
                                                    for (const product of allNotificationUsers) {

                                                        // checks if there are notification users for the product
                                                        const notificationUsers = product.data.notificationUsers;
                                                        if (notificationUsers) {

                                                            // separates the id of each user
                                                            const userIds = Object.keys(notificationUsers);
                                                            for (const userId of userIds) {

                                                                // search for each user with fetch
                                                                const userFetch = await client.users.fetch(userId);

                                                                // variables with product information
                                                                const nameP = await dbProducts.get(`${idProduct}.name`);
                                                                const channelP = await dbProducts.get(`${idProduct}.msgLocalization.channelId`);

                                                                // channel - fetch
                                                                const channelFetch = await iButton.guild.channels.cache.get(channelP);

                                                                // attempts to send a message to the user's DM
                                                                // informing them of new stock on the product
                                                                await userFetch.send({
                                                                    embeds: [new EmbedBuilder()
                                                                        .setTitle(`${client.user.username} | Notificação`)
                                                                        .setDescription(`🔔 | O estoque do produto: **${nameP}** foi reabastecido com \`${addedItems}\` itens.\n\n🛒 | O produto se encontra no canal: ${channelFetch || `**Não encontrado**`}.`)
                                                                        .setColor(`NotQuiteBlack`)
                                                                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })
                                                                    ]
                                                                }).catch((err) => {
                                                                    return;
                                                                });

                                                            };

                                                        };

                                                    };

                                                };

                                                // message - success
                                                await iButton.followUp({
                                                    content: `✅ | Foram adicionados \`${addedItems}\` itens em seu estoque.`,
                                                    ephemeral: true
                                                });

                                                // stop the collector (collectorConfigStockAdd)
                                                await collectorConfigStockAdd.stop();

                                            };

                                        });

                                    };

                                    // previousPageStockAdd - button
                                    if (iStockAdd.customId == `previousPageStockAdd`) {

                                        // deferUpdate - postphone the update
                                        await iStockAdd.deferUpdate();

                                        // checks if the number of items in stock exceeds 50
                                        const estoqueP = await dbProducts.get(`${idProduct}.stock`);
                                        if (estoqueP.length <= 25) {

                                            // embed stock
                                            const embedStock = new EmbedBuilder()

                                            // formatted stock
                                            let formattedStock = estoqueP
                                                .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                .join("\n") || "Sem estoque, Adicione."

                                            // checks if messages with stock items exceed 4096 characters
                                            // and limits it to 10 items
                                            if (formattedStock.length > 4096) {

                                                // set items with a limit of 10 in the variable
                                                formattedStock = estoqueP
                                                    .slice(0, 10)
                                                    .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                    .join("\n") || "Sem estoque, Adicione."

                                                // arrow the information in the embed stock
                                                embedStock
                                                    .setTitle(`${client.user.username} | Configurando Estoque`)
                                                    .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Existem mais itens no total, faça um backup para ver o estoque completo.`, iconURL: client.user.avatarURL() })

                                            } else {

                                                // arrow the information in the embed stock
                                                embedStock
                                                    .setTitle(`${client.user.username} | Configurando Estoque`)
                                                    .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Este é seu estoque completo.`, iconURL: client.user.avatarURL() })

                                            };

                                            // message - edit
                                            await msg.edit({
                                                embeds: [embedStock],
                                                components: [rowStock1, rowStock2]
                                            });

                                        } else {

                                            // formatted stock
                                            let formattedStock = estoqueP
                                                .slice(0, 25)
                                                .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                .join("\n") || "Sem estoque, Adicione."

                                            // checks if messages with stock items exceed 4096 characters
                                            // and limits it to 10 items
                                            if (formattedStock.length > 4096) {

                                                // set items with a limit of 10 in the variable
                                                formattedStock = estoqueP
                                                    .slice(0, 10)
                                                    .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                    .join("\n") || "Sem estoque, Adicione."

                                            };

                                            // embed stock
                                            const embedStock = new EmbedBuilder()
                                                .setTitle(`${client.user.username} | Configurando Estoque`)
                                                .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                .setColor(`NotQuiteBlack`)
                                                .setFooter({ text: `Existem mais itens no total, faça um backup para ver o estoque completo.`, iconURL: client.user.avatarURL() })

                                            // message - edit
                                            await msg.edit({
                                                embeds: [embedStock],
                                                components: [rowStock1, rowStock2]
                                            });

                                        };

                                        // stop the collector (collectorConfigStockAdd)
                                        await collectorConfigStockAdd.stop();

                                    };

                                });

                            };

                            // removeStock - option
                            if (valueId == `removeStock`) {

                                // checks if the product has stock to back it up
                                const estoqueP = await dbProducts.get(`${idProduct}.stock`);
                                if (estoqueP.length < 1) {
                                    await iConfigStock.reply({
                                        content: `❌ | Este produto não tem estoque, Adicione primeiro.`,
                                        ephemeral: true
                                    });
                                    return;
                                };

                                // variables with product information
                                const nameP = await dbProducts.get(`${idProduct}.name`);

                                // create the modal
                                const modal = new ModalBuilder()
                                    .setCustomId(`modalNumLine-${idProduct}`)
                                    .setTitle(`📦  | ${nameP}`)

                                // creates the components for the modal
                                const inputNumLine = new TextInputBuilder()
                                    .setCustomId('numLine')
                                    .setLabel(`Insira a linha do item:`)
                                    .setMaxLength(2)
                                    .setPlaceholder(`Exemplo: 1`)
                                    .setRequired(true)
                                    .setStyle(`Paragraph`)

                                // rows for components
                                const iLine = new ActionRowBuilder().addComponents(inputNumLine);

                                // add the rows to the modal
                                modal.addComponents(iLine);

                                // open the modal
                                await iConfigStock.showModal(modal);

                                // event - interactionCreate
                                client.once("interactionCreate", async (iModal) => {

                                    // modalLines - modal
                                    if (iModal.customId == `modalNumLine-${idProduct}`) {

                                        // deferUpdate - postphone the update
                                        await iModal.deferUpdate();

                                        // inserted number line - confirm
                                        const insertedLine = iModal.fields.getTextInputValue(`numLine`);

                                        // checks whether the number line entered is a valid number
                                        const estoqueAll = await dbProducts.get(`${idProduct}.stock`);
                                        if (isNaN(insertedLine) || insertedLine < 0 || insertedLine >= estoqueAll.length) {
                                            await iModal.followUp({
                                                content: `❌ | A linha inserida não foi encontrada.`,
                                                ephemeral: true
                                            });
                                            return;
                                        };

                                        // removes the item selected by the inventory line
                                        const itemRemoved = await estoqueAll.splice(insertedLine, 1)
                                        await dbProducts.set(`${idProduct}.stock`, estoqueAll);

                                        // checks if the number of items in stock exceeds 50
                                        const estoqueP = await dbProducts.get(`${idProduct}.stock`);
                                        if (estoqueP.length <= 25) {

                                            // embed stock
                                            const embedStock = new EmbedBuilder()

                                            // formatted stock
                                            let formattedStock = estoqueP
                                                .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                .join("\n") || "Sem estoque, Adicione."

                                            // checks if messages with stock items exceed 4096 characters
                                            // and limits it to 10 items
                                            if (formattedStock.length > 4096) {

                                                // set items with a limit of 10 in the variable
                                                formattedStock = estoqueP
                                                    .slice(0, 10)
                                                    .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                    .join("\n") || "Sem estoque, Adicione."

                                                // arrow the information in the embed stock
                                                embedStock
                                                    .setTitle(`${client.user.username} | Configurando Estoque`)
                                                    .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Existem mais itens no total, faça um backup para ver o estoque completo.`, iconURL: client.user.avatarURL() })

                                            } else {

                                                // arrow the information in the embed stock
                                                embedStock
                                                    .setTitle(`${client.user.username} | Configurando Estoque`)
                                                    .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Este é seu estoque completo.`, iconURL: client.user.avatarURL() })

                                            };

                                            // message - edit
                                            await msg.edit({
                                                embeds: [embedStock],
                                                components: [rowStock1, rowStock2]
                                            });

                                        } else {

                                            // formatted stock
                                            let formattedStock = estoqueP
                                                .slice(0, 25)
                                                .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                .join("\n") || "Sem estoque, Adicione."

                                            // checks if messages with stock items exceed 4096 characters
                                            // and limits it to 10 items
                                            if (formattedStock.length > 4096) {

                                                // set items with a limit of 10 in the variable
                                                formattedStock = estoqueP
                                                    .slice(0, 10)
                                                    .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                    .join("\n") || "Sem estoque, Adicione."

                                            };

                                            // embed stock
                                            const embedStock = new EmbedBuilder()
                                                .setTitle(`${client.user.username} | Configurando Estoque`)
                                                .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                .setColor(`NotQuiteBlack`)
                                                .setFooter({ text: `Existem mais itens no total, faça um backup para ver o estoque completo.`, iconURL: client.user.avatarURL() })

                                            // message - edit
                                            await msg.edit({
                                                embeds: [embedStock],
                                                components: [rowStock1, rowStock2]
                                            });

                                        };

                                        // message - success
                                        await iModal.followUp({
                                            content: `✅ | Produto: \`${itemRemoved}\` removido com sucesso.`,
                                            ephemeral: true
                                        });

                                    };

                                });

                            };

                            // backupStock - option
                            if (valueId == `backupStock`) {

                                // checks if the product has stock to back it up
                                const estoqueP = await dbProducts.get(`${idProduct}.stock`);
                                if (estoqueP.length < 1) {
                                    await iConfigStock.reply({
                                        content: `❌ | Este produto não tem estoque, Adicione primeiro.`,
                                        ephemeral: true
                                    });
                                    return;
                                };

                                // private log channel not configured or invalid
                                const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                if (!channelLogsPriv) {
                                    await iConfigStock.reply({
                                        content: `❌ | Não foi possível localizar nenhum canal de logs privado configurado. Por favor, defina um utilizando o comando **/gerenciar**.`,
                                        ephemeral: true
                                    });
                                    return;
                                };

                                // deferUpdate - postphone the update
                                await iConfigStock.deferUpdate();

                                // variables with product information
                                const nameP = await dbProducts.get(`${idProduct}.name`);

                                // gets all items from the product's stock
                                let fileContent = "";
                                for (let i = 0; i < estoqueP.length; i++) {
                                    fileContent += `📦 | ${nameP} - ${i + 1}/${estoqueP.length}:\n${estoqueP[i]}\n\n`;
                                };

                                // creates the txt file with the items
                                const fileName = `${nameP}.txt`;
                                fs.writeFile(fileName, fileContent, (err) => {
                                    if (err) throw err;
                                });

                                // creates the attachment for the files
                                const stockAttachment = new AttachmentBuilder(fileName);

                                // log - backup - channel
                                if (channelLogsPriv) {
                                    await channelLogsPriv.send({
                                        content: `✅ | Backup do estoque do produto: \`${nameP}\` realizado por ${iConfigStock.user}, com um total de \`${estoqueP.length}\` itens.`,
                                        files: [stockAttachment]
                                    }).then(async (msg) => {

                                        // message - success
                                        await iConfigStock.followUp({
                                            content: `✅ | Backup do estoque enviado com sucesso para o canal ${channelLogsPriv}.`,
                                            components: [new ActionRowBuilder()
                                                .addComponents(
                                                    new ButtonBuilder().setLabel(`Ir para o Canal`).setEmoji(`🤖`).setStyle(`Link`).setURL(channelLogsPriv.url)
                                                )
                                            ],
                                            ephemeral: true
                                        });

                                    }).catch(async (err) => {

                                        // log - backup - user
                                        await iConfigStock.user.send({
                                            content: `✅ | Backup do estoque do produto: \`${nameP}\` com um total de \`${estoqueP.length}\` itens.`,
                                            files: [stockAttachment]
                                        }).then(async (msg) => {

                                            // message - success
                                            const DMBot = await interaction.user.createDM();
                                            await iConfigStock.followUp({
                                                content: `✅ | Backup do estoque enviado com sucesso para a sua DM ${channelLogsPriv}.`,
                                                components: [new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder()
                                                            .setLabel(`Atalho para DM`)
                                                            .setEmoji(`🤖`)
                                                            .setStyle(`Link`)
                                                            .setURL(DMBot.url)
                                                    )
                                                ],
                                                ephemeral: true
                                            });

                                        }).catch(async (err) => {

                                            // message - error
                                            await iConfigStock.followUp({
                                                content: `❌ | Não foi possível enviar o backup nem para o canal de logs privado, nem para sua DM. Por favor, verifique se ambos estão abertos e configurados corretamente.`,
                                                ephemeral: true
                                            });

                                            return;
                                        });

                                    });
                                };

                                // delete the file after sending
                                fs.unlink(fileName, (err) => {
                                    if (err) throw err;
                                });

                            };

                        };

                        // clearStock - button
                        if (iConfigStock.customId == `clearStock`) {

                            // variables with product information
                            const nameP = await dbProducts.get(`${idProduct}.name`);

                            // create the modal
                            const modal = new ModalBuilder()
                                .setCustomId(`modalConfirm-${idProduct}`)
                                .setTitle(`📝 | ${nameP}`)

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
                            await iConfigStock.showModal(modal);

                            // event - interactionCreate
                            client.once("interactionCreate", async (iModal) => {

                                // modalLines - modal
                                if (iModal.customId == `modalConfirm-${idProduct}`) {

                                    // deferUpdate - postphone the update
                                    await iModal.deferUpdate();

                                    // inserted text - confirm
                                    const insertedText = iModal.fields.getTextInputValue(`confirmText`)
                                        .toLowerCase();

                                    // checks if confirmText is equal to "sim"
                                    if (insertedText == `sim`) {

                                        // clears product stock
                                        await dbProducts.set(`${idProduct}.stock`, []);

                                        // checks if the number of items in stock exceeds 50
                                        const estoqueP = await dbProducts.get(`${idProduct}.stock`);
                                        if (estoqueP.length <= 25) {

                                            // embed stock
                                            const embedStock = new EmbedBuilder()

                                            // formatted stock
                                            let formattedStock = estoqueP
                                                .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                .join("\n") || "Sem estoque, Adicione."

                                            // checks if messages with stock items exceed 4096 characters
                                            // and limits it to 10 items
                                            if (formattedStock.length > 4096) {

                                                // set items with a limit of 10 in the variable
                                                formattedStock = estoqueP
                                                    .slice(0, 10)
                                                    .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                    .join("\n") || "Sem estoque, Adicione."

                                                // arrow the information in the embed stock
                                                embedStock
                                                    .setTitle(`${client.user.username} | Configurando Estoque`)
                                                    .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Existem mais itens no total, faça um backup para ver o estoque completo.`, iconURL: client.user.avatarURL() })

                                            } else {

                                                // arrow the information in the embed stock
                                                embedStock
                                                    .setTitle(`${client.user.username} | Configurando Estoque`)
                                                    .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Este é seu estoque completo.`, iconURL: client.user.avatarURL() })

                                            };

                                            // message - edit
                                            await msg.edit({
                                                embeds: [embedStock],
                                                components: [rowStock1, rowStock2]
                                            });

                                        } else {

                                            // formatted stock
                                            let formattedStock = estoqueP
                                                .slice(0, 25)
                                                .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                .join("\n") || "Sem estoque, Adicione."

                                            // checks if messages with stock items exceed 4096 characters
                                            // and limits it to 10 items
                                            if (formattedStock.length > 4096) {

                                                // set items with a limit of 10 in the variable
                                                formattedStock = estoqueP
                                                    .slice(0, 10)
                                                    .map((item, i) => `**📦 | ${i + 0} -** ${item}`)
                                                    .join("\n") || "Sem estoque, Adicione."

                                            };

                                            // embed stock
                                            const embedStock = new EmbedBuilder()
                                                .setTitle(`${client.user.username} | Configurando Estoque`)
                                                .setDescription(`**Este é seu Estoque:**\n${formattedStock}`)
                                                .setColor(`NotQuiteBlack`)
                                                .setFooter({ text: `Existem mais itens no total, faça um backup para ver o estoque completo.`, iconURL: client.user.avatarURL() })

                                            // message - edit
                                            await msg.edit({
                                                embeds: [embedStock],
                                                components: [rowStock1, rowStock2]
                                            });

                                        };

                                    };

                                };

                            });

                        };

                        // previousPageStock - button
                        if (iConfigStock.customId == `previousPageStock`) {

                            // deferUpdate - postphone the update
                            await iConfigStock.deferUpdate();

                            // variables with product information
                            const nameP = await dbProducts.get(`${idProduct}.name`);
                            const descriptionP = await dbProducts.get(`${idProduct}.description`);
                            const priceP = await dbProducts.get(`${idProduct}.price`);
                            const estoqueP = await dbProducts.get(`${idProduct}.stock`);

                            // embed product
                            const embedProduct = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Configurando Produto`)
                                .setDescription(`**📜 | Descrição:\n\`\`\`${descriptionP}\`\`\`\n📝 | ID: \`${idProduct}\`\n🌎 | Nome: \`${nameP}\`\n💸 | Preço: \`R$${Number(priceP).toFixed(2)}\`\n📦 | Estoque: \`${estoqueP.length}\`**`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                            // message - edit
                            await msg.edit({
                                embeds: [embedProduct],
                                components: [rowProduct1, rowProduct2]
                            });

                            // stop the collector (collectorConfigStock)
                            await collectorConfigStock.stop();

                        };

                    });

                };

                // advancedConfigs - button
                if (iConfig.customId == `advancedConfigs`) {

                    // deferUpdate - postphone the update
                    await iConfig.deferUpdate();

                    // row advanced configs - select menu (1)
                    const rowConfigsAdv1 = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder().setCustomId(`changesAdvConfig`).setPlaceholder(`Selecione uma opção (Produto)`)
                                .setOptions(
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Banner`).setEmoji(`🖼`).setDescription(`Altere o banner do seu produto.`).setValue(`changeBanner`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Miniatura`).setEmoji(`🖼`).setDescription(`Altere a miniatura do seu produto.`).setValue(`changeThumbnail`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Cargo`).setEmoji(`👤`).setDescription(`Altere o cargo de cliente do seu produto.`).setValue(`changeRole`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Alterar Cor`).setEmoji(`🖌️`).setDescription(`Altere a cor da embed do seu produto.`).setValue(`changeColor`),
                                    new StringSelectMenuOptionBuilder().setLabel(`Ativar/Desativar Cupons`).setEmoji(`💳`).setDescription(`Ative/Desative o uso de cupons em seu produto.`).setValue(`changeCouponOnOff`)
                                )
                        );

                    // row advanced configs - button (2)
                    const rowConfigsAdv2 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`previousPageCAdv`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                        );

                    // variables with product information
                    const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                    const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                    const colorP = await dbProducts.get(`${idProduct}.color`);
                    const roleP = await dbProducts.get(`${idProduct}.role`);
                    const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                    // variables with information formatted for embed
                    const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                    const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                    const roleFormatted = roleP !== "none" ? iConfig.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                    const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                    const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                    // embed advanced configs
                    const embedConfigsAdv = new EmbedBuilder()
                        .setTitle(`${client.user.username} | Configurações Avançadas`)
                        .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                        .setColor(`NotQuiteBlack`)
                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                    // message - edit
                    await msg.edit({
                        embeds: [embedConfigsAdv],
                        components: [rowConfigsAdv1, rowConfigsAdv2]
                    });

                    // createMessageComponentCollector - collector
                    const filter = (m) => m.user.id == interaction.user.id;
                    const collectorConfigAdv = msg.createMessageComponentCollector({
                        filter: filter,
                        time: 600000
                    });
                    collectorConfigAdv.on("collect", async (iConfigAdv) => {

                        // changesAdvConfig - select menu
                        if (iConfigAdv.customId == `changesAdvConfig`) {

                            // deferUpdate - postphone the update
                            await iConfigAdv.deferUpdate();

                            // edit the message and remove the selected option
                            await msg.edit({
                                components: [rowConfigsAdv1, rowConfigsAdv2]
                            });

                            // value id
                            const valueId = iConfigAdv.values[0];

                            // changeBanner - option
                            if (valueId == `changeBanner`) {

                                // variables with product information
                                const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);

                                // variables with information formatted for embed
                                const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;

                                // message - edit
                                await msg.edit({
                                    embeds: [new EmbedBuilder()
                                        .setTitle(`${client.user.username} | Banner`)
                                        .setDescription(`Envie o link do banner que será utilizado ou clique no botão abaixo para remover! (${bannerFormatted})`)
                                        .setFooter({ text: `Você tem 2 minutos para enviar.` })
                                        .setColor(`NotQuiteBlack`)
                                    ],
                                    components: [new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder().setCustomId(`removeImage-${idProduct}`).setLabel(`REMOVER`).setEmoji(`🗑`).setStyle(`Danger`),
                                            new ButtonBuilder().setCustomId(`previousPageConfigsAdv-${idProduct}`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                        )
                                    ]
                                });

                                // createMessageCollector - collector
                                const collectorMsg = channel.createMessageCollector({
                                    filter: (m) => m.author.id == interaction.user.id,
                                    max: 1,
                                    time: 120000 // 2 minutes
                                });
                                collectorMsg.on("collect", async (iMsg) => {

                                    // delete the message (iMsg)
                                    await iMsg.delete();

                                    // message (trim)
                                    const msgContent = iMsg.content
                                        .trim();

                                    // invalid link
                                    if (!url.parse(msgContent).protocol || !url.parse(msgContent).hostname) {

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iConfigAdv.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                        // message - error
                                        await iConfigAdv.followUp({
                                            content: `❌ | O URL inserido não é válido. Por favor, verifique e tente novamente!`,
                                            ephemeral: true
                                        });

                                        return;
                                    };

                                    // set the new information in dbProducts (wio.db)
                                    await dbProducts.set(`${idProduct}.bannerUrl`, msgContent);

                                    // variables with product information
                                    const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                    const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                    const colorP = await dbProducts.get(`${idProduct}.color`);
                                    const roleP = await dbProducts.get(`${idProduct}.role`);
                                    const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                    // variables with information formatted for embed
                                    const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                    const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                    const roleFormatted = roleP !== "none" ? iConfigAdv.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                    const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                    const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                    // embed advanced configs
                                    const embedConfigsAdv = new EmbedBuilder()
                                        .setTitle(`${client.user.username} | Configurações Avançadas`)
                                        .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                        .setColor(`NotQuiteBlack`)
                                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                    // message - edit
                                    await msg.edit({
                                        embeds: [embedConfigsAdv],
                                        components: [rowConfigsAdv1, rowConfigsAdv2]
                                    });

                                });

                                // end of time - collector (collectorMsg)
                                collectorMsg.on("end", async (c, r) => {
                                    if (r == "time") {

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iConfigAdv.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                    };
                                });

                                // try catch
                                try {

                                    // awaitMessageComponent - collector
                                    const collectorFilter = (i) => i.user.id == interaction.user.id;
                                    const iAwait = await msg.awaitMessageComponent({ filter: collectorFilter, time: 120000 });

                                    // removeImage - button
                                    if (iAwait.customId == `removeImage-${idProduct}`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // remove the image by dbProducts (wio.db)
                                        await dbProducts.set(`${idProduct}.bannerUrl`, `none`);

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iAwait.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                        // stop the collector (collectorMsg)
                                        await collectorMsg.stop();

                                    };

                                    // previousPageConfigsAdv - button
                                    if (iAwait.customId == `previousPageConfigsAdv-${idProduct}`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iAwait.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                        // stop the collector (collectorMsg)
                                        await collectorMsg.stop();

                                    };

                                } catch (err) {
                                    return;
                                };

                            };

                            // changeThumbnail - option
                            if (valueId == `changeThumbnail`) {

                                // variables with product information
                                const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);

                                // variables with information formatted for embed
                                const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;

                                // message - edit
                                await msg.edit({
                                    embeds: [new EmbedBuilder()
                                        .setTitle(`${client.user.username} | Miniatura`)
                                        .setDescription(`Envie o link da miniatura que será utilizada ou clique no botão abaixo para remover! (${thumbFormatted})`)
                                        .setFooter({ text: `Você tem 2 minutos para enviar.` })
                                        .setColor(`NotQuiteBlack`)
                                    ],
                                    components: [new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder().setCustomId(`removeImage-${idProduct}`).setLabel(`REMOVER`).setEmoji(`🗑`).setStyle(`Danger`),
                                            new ButtonBuilder().setCustomId(`previousPageConfigsAdv-${idProduct}`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                        )
                                    ]
                                });

                                // createMessageCollector - collector
                                const collectorMsg = channel.createMessageCollector({
                                    filter: (m) => m.author.id == interaction.user.id,
                                    max: 1,
                                    time: 120000 // 2 minutes
                                });
                                collectorMsg.on("collect", async (iMsg) => {

                                    // delete the message (iMsg)
                                    await iMsg.delete();

                                    // message (trim)
                                    const msgContent = iMsg.content
                                        .trim();

                                    // invalid link
                                    if (!url.parse(msgContent).protocol || !url.parse(msgContent).hostname) {

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iConfigAdv.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                        // message - error
                                        await iConfigAdv.followUp({
                                            content: `❌ | O URL inserido não é válido. Por favor, verifique e tente novamente!`,
                                            ephemeral: true
                                        });

                                        return;
                                    };

                                    // set the new information in dbProducts (wio.db)
                                    await dbProducts.set(`${idProduct}.thumbUrl`, msgContent);

                                    // variables with product information
                                    const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                    const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                    const colorP = await dbProducts.get(`${idProduct}.color`);
                                    const roleP = await dbProducts.get(`${idProduct}.role`);
                                    const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                    // variables with information formatted for embed
                                    const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                    const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                    const roleFormatted = roleP !== "none" ? iConfigAdv.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                    const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                    const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                    // embed advanced configs
                                    const embedConfigsAdv = new EmbedBuilder()
                                        .setTitle(`${client.user.username} | Configurações Avançadas`)
                                        .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                        .setColor(`NotQuiteBlack`)
                                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                    // message - edit
                                    await msg.edit({
                                        embeds: [embedConfigsAdv],
                                        components: [rowConfigsAdv1, rowConfigsAdv2]
                                    });

                                });

                                // end of time - collector (collectorMsg)
                                collectorMsg.on("end", async (c, r) => {
                                    if (r == "time") {

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iConfigAdv.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                    };
                                });

                                // try catch
                                try {

                                    // awaitMessageComponent - collector
                                    const collectorFilter = (i) => i.user.id == interaction.user.id;
                                    const iAwait = await msg.awaitMessageComponent({ filter: collectorFilter, time: 120000 });

                                    // removeImage - button
                                    if (iAwait.customId == `removeImage-${idProduct}`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // remove the image by dbProducts (wio.db)
                                        await dbProducts.set(`${idProduct}.thumbUrl`, `none`);

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iAwait.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                        // stop the collector (collectorMsg)
                                        await collectorMsg.stop();

                                    };

                                    // previousPageConfigsAdv - button
                                    if (iAwait.customId == `previousPageConfigsAdv-${idProduct}`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iAwait.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                        // stop the collector (collectorMsg)
                                        await collectorMsg.stop();

                                    };

                                } catch (err) {
                                    return;
                                };

                            };

                            if (valueId == `changeRole`) {

                                // variables with product information
                                const roleP = await dbProducts.get(`${idProduct}.role`);

                                // variables with information formatted for embed
                                const roleFormatted = roleP !== "none" ? iConfigAdv.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;

                                // message - edit
                                await msg.edit({
                                    embeds: [new EmbedBuilder()
                                        .setTitle(`${client.user.username} | Cargo`)
                                        .setDescription(`Selecione o cargo de cliente que será utilizado ou clique no botão abaixo para remover! (${roleFormatted})`)
                                        .setFooter({ text: `Você tem 2 minutos para selecionar.` })
                                        .setColor(`NotQuiteBlack`)
                                    ],
                                    components: [new ActionRowBuilder()
                                        .addComponents(
                                            new RoleSelectMenuBuilder().setCustomId(`selectRoleMenu`).setPlaceholder(`Selecione um Cargo`)
                                        ), new ActionRowBuilder()
                                            .addComponents(
                                                new ButtonBuilder().setCustomId(`removeRole-${idProduct}`).setLabel(`REMOVER`).setEmoji(`🗑`).setStyle(`Danger`),
                                                new ButtonBuilder().setCustomId(`previousPageConfigsAdv-${idProduct}`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                            )
                                    ]
                                });

                                // try catch
                                try {

                                    // awaitMessageComponent - collector
                                    const collectorFilter = (i) => i.user.id == interaction.user.id;
                                    const iAwait = await msg.awaitMessageComponent({ filter: collectorFilter, time: 120000 });

                                    // selectRoleMenu - select menu
                                    if (iAwait.customId == `selectRoleMenu`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // value id - user id
                                        const valueId = iAwait.values[0];

                                        // remove the information by dbProducts (wio.db)
                                        await dbProducts.set(`${idProduct}.role`, valueId);

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iAwait.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                    };

                                    // removeImage - button
                                    if (iAwait.customId == `removeRole-${idProduct}`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // remove the information by dbProducts (wio.db)
                                        await dbProducts.set(`${idProduct}.role`, `none`);

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iAwait.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                    };

                                    // previousPageConfigsAdv - button
                                    if (iAwait.customId == `previousPageConfigsAdv-${idProduct}`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iAwait.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                    };

                                } catch (err) {
                                    return;
                                };

                            };

                            // changeColor - option
                            if (valueId == `changeColor`) {

                                // variables with product information
                                const colorP = await dbProducts.get(`${idProduct}.color`);

                                // variables with information formatted for embed
                                const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;

                                // message - edit
                                await msg.edit({
                                    embeds: [new EmbedBuilder()
                                        .setTitle(`${client.user.username} | Cor`)
                                        .setDescription(`Envie a cor que será utilizada ou clique no botão abaixo para remover! (${colorFormatted})`)
                                        .setFooter({ text: `Você tem 2 minutos para enviar.` })
                                        .setColor(`NotQuiteBlack`)
                                    ],
                                    components: [new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder().setCustomId(`removeColor-${idProduct}`).setLabel(`REMOVER`).setEmoji(`🗑`).setStyle(`Danger`),
                                            new ButtonBuilder().setCustomId(`previousPageConfigsAdv-${idProduct}`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                        )
                                    ]
                                });

                                // createMessageCollector - collector
                                const collectorMsg = channel.createMessageCollector({
                                    filter: (m) => m.author.id == interaction.user.id,
                                    max: 1,
                                    time: 120000 // 2 minutes
                                });
                                collectorMsg.on("collect", async (iMsg) => {

                                    // delete the message (iMsg)
                                    await iMsg.delete();

                                    // message (trim)
                                    const msgContent = iMsg.content
                                        .trim();

                                    // invalid color format
                                    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
                                    if (!colorRegex.test(msgContent)) {

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iConfigAdv.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                        // message - error
                                        await iConfigAdv.followUp({
                                            content: `❌ | Formato de cor inválida.`,
                                            ephemeral: true
                                        });

                                        return;
                                    };

                                    // set the new information in dbProducts (wio.db)
                                    await dbProducts.set(`${idProduct}.color`, msgContent);

                                    // variables with product information
                                    const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                    const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                    const colorP = await dbProducts.get(`${idProduct}.color`);
                                    const roleP = await dbProducts.get(`${idProduct}.role`);
                                    const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                    // variables with information formatted for embed
                                    const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                    const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                    const roleFormatted = roleP !== "none" ? iConfigAdv.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                    const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                    const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                    // embed advanced configs
                                    const embedConfigsAdv = new EmbedBuilder()
                                        .setTitle(`${client.user.username} | Configurações Avançadas`)
                                        .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                        .setColor(`NotQuiteBlack`)
                                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                    // message - edit
                                    await msg.edit({
                                        embeds: [embedConfigsAdv],
                                        components: [rowConfigsAdv1, rowConfigsAdv2]
                                    });

                                });

                                // end of time - collector (collectorMsg)
                                collectorMsg.on("end", async (c, r) => {
                                    if (r == "time") {

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iConfigAdv.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                    };
                                });

                                // try catch
                                try {

                                    // awaitMessageComponent - collector
                                    const collectorFilter = (i) => i.user.id == interaction.user.id;
                                    const iAwait = await msg.awaitMessageComponent({ filter: collectorFilter, time: 120000 });

                                    // removeImage - button
                                    if (iAwait.customId == `removeColor-${idProduct}`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // remove the image by dbProducts (wio.db)
                                        await dbProducts.set(`${idProduct}.color`, `none`);

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iAwait.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                        // stop the collector (collectorMsg)
                                        await collectorMsg.stop();

                                    };

                                    // previousPageConfigsAdv - button
                                    if (iAwait.customId == `previousPageConfigsAdv-${idProduct}`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // variables with product information
                                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                        const colorP = await dbProducts.get(`${idProduct}.color`);
                                        const roleP = await dbProducts.get(`${idProduct}.role`);
                                        const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                        // variables with information formatted for embed
                                        const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                        const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                        const roleFormatted = roleP !== "none" ? iAwait.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                        const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                        const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                        // embed advanced configs
                                        const embedConfigsAdv = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Configurações Avançadas`)
                                            .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedConfigsAdv],
                                            components: [rowConfigsAdv1, rowConfigsAdv2]
                                        });

                                        // stop the collector (collectorMsg)
                                        await collectorMsg.stop();

                                    };

                                } catch (err) {
                                    return;
                                };

                            };

                            // changeCouponOnOff - option
                            if (valueId == `changeCouponOnOff`) {

                                // variables with product information
                                const useCouponStatus = await dbProducts.get(`${idProduct}.useCoupon`);

                                // checks if it is on or off and takes action for each status
                                if (useCouponStatus) {

                                    // changes coupon usage status to false by dbProducts (wio.db)
                                    await dbProducts.set(`${idProduct}.useCoupon`, false);

                                } else {

                                    // changes coupon usage status to true by dbProducts (wio.db)
                                    await dbProducts.set(`${idProduct}.useCoupon`, true);

                                };

                                // variables with product information
                                const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                                const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                                const colorP = await dbProducts.get(`${idProduct}.color`);
                                const roleP = await dbProducts.get(`${idProduct}.role`);
                                const useCouponP = await dbProducts.get(`${idProduct}.useCoupon`);

                                // variables with information formatted for embed
                                const bannerFormatted = bannerP !== "none" ? `[Link da Imagem](${bannerP})` : `\`Não configurado.\``;
                                const thumbFormatted = thumbP !== "none" ? `[Link da Imagem](${thumbP})` : `\`Não configurada.\``;
                                const roleFormatted = roleP !== "none" ? iConfigAdv.guild.roles.cache.get(roleP) || `\`${roleP} não encontrado.\`` : `\`Não configurado.\``;
                                const colorFormatted = colorP !== "none" ? `\`${colorP}\`` : `\`Não configurada.\``;
                                const useCouponFormatted = useCouponP ? `\`Ativado.\`` : `\`Desativado.\``;

                                // embed advanced configs
                                const embedConfigsAdv = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurações Avançadas`)
                                    .setDescription(`**🖼 | Banner: ${bannerFormatted}\n🖼 | Miniatura: ${thumbFormatted}\n👤 | Cargo: ${roleFormatted}\n🖌️ | Cor Embed: ${colorFormatted}\n💳 | Uso de Cupons: ${useCouponFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                                // message - edit
                                await msg.edit({
                                    embeds: [embedConfigsAdv],
                                    components: [rowConfigsAdv1, rowConfigsAdv2]
                                });

                            };

                        };

                        // previousPageStock - button
                        if (iConfigAdv.customId == `previousPageCAdv`) {

                            // deferUpdate - postphone the update
                            await iConfigAdv.deferUpdate();

                            // variables with product information
                            const nameP = await dbProducts.get(`${idProduct}.name`);
                            const descriptionP = await dbProducts.get(`${idProduct}.description`);
                            const priceP = await dbProducts.get(`${idProduct}.price`);
                            const estoqueP = await dbProducts.get(`${idProduct}.stock`);

                            // row product - button (2)
                            const rowProduct2 = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`advancedConfigs`).setLabel(`Configurações Avançadas`).setEmoji(`🔧`).setStyle(`Primary`),
                                    new ButtonBuilder().setCustomId(`updateMsg`).setLabel(`Atualizar Mensagem`).setEmoji(`🔁`).setStyle(`Primary`),
                                    new ButtonBuilder().setCustomId(`deleteProduct`).setLabel(`DELETAR`).setEmoji(`🗑`).setStyle(`Danger`),
                                    new ButtonBuilder().setCustomId(`infoProduct`).setEmoji(`📝`).setStyle(`Primary`)
                                );

                            // embed product
                            const embedProduct = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Configurando Produto`)
                                .setDescription(`**📜 | Descrição:\n\`\`\`${descriptionP}\`\`\`\n📝 | ID: \`${idProduct}\`\n🌎 | Nome: \`${nameP}\`\n💸 | Preço: \`R$${Number(priceP).toFixed(2)}\`\n📦 | Estoque: \`${estoqueP.length}\`**`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() })

                            // message - edit
                            await msg.edit({
                                embeds: [embedProduct],
                                components: [rowProduct1, rowProduct2]
                            });

                            // stop the collector (collectorConfigStock)
                            await collectorConfigAdv.stop();

                        };

                    });

                };

                // updateMsg - button - global
                if (iConfig.customId == `updateMsg`) {

                    // deferUpdate - postphone the update
                    await iConfig.deferUpdate();

                    // try catch
                    try {

                        // variables with message/channel ids by dbProducts (wio.db)
                        const channelId = await dbProducts.get(`${idProduct}.msgLocalization.channelId`);
                        const messageId = await dbProducts.get(`${idProduct}.msgLocalization.messageId`);

                        // message channel
                        const channelMsg = await client.channels.fetch(channelId);

                        // purchase message
                        const msgFetched = await channelMsg.messages.fetch(messageId);

                        // variables with product information
                        const nameP = await dbProducts.get(`${idProduct}.name`);
                        const descriptionP = await dbProducts.get(`${idProduct}.description`);
                        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
                        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
                        const colorP = await dbProducts.get(`${idProduct}.color`);
                        const priceP = await dbProducts.get(`${idProduct}.price`);
                        const estoqueP = await dbProducts.get(`${idProduct}.stock`);

                        // variables with dbConfigs information
                        const thumbC = await dbConfigs.get(`images.thumbUrl`);
                        const bannerC = await dbConfigs.get(`images.bannerUrl`);
                        const colorC = await dbConfigs.get(`embeds.color`);

                        // row product
                        const rowProduct = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(idProduct).setLabel(`Comprar`).setEmoji(`🛒`).setStyle(`Success`)
                            );

                        // embed product
                        const embedProduct = new EmbedBuilder()
                            .setTitle(`${client.user.username} | Produto`)
                            .setDescription(`**\`\`\`${descriptionP}\`\`\`\n🌎 | Nome: ${nameP}\n💸 | Preço: R$__${Number(priceP).toFixed(2)}__\n📦 | Estoque: __${estoqueP.length}__**`)
                            .setThumbnail(thumbP !== "none" ? thumbP : thumbC !== "none" ? thumbC : "https://sem-img.com")
                            .setImage(bannerP !== "none" ? bannerP : bannerC !== "none" ? bannerC : "https://sem-img.com")
                            .setColor(colorP !== "none" ? colorP : colorC !== "none" ? colorC : "NotQuiteBlack")

                        // message - edit
                        await msgFetched.edit({
                            embeds: [embedProduct],
                            components: [rowProduct]
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
                                content: `❌ | Nenhum canal foi encontrado! Utilize **/set** para setar sua mensagem de compra em um canal.`,
                                ephemeral: true
                            });

                        } else if (err.code == 10008) {
                            await iConfig.followUp({
                                content: `❌ | A mensagem não foi encontrada! Utilize **/set** para setar a mensagem de compra do seu produto.`,
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

                // deleteProduct - button
                if (iConfig.customId == `deleteProduct`) {

                    // variables with product information
                    const nameP = await dbProducts.get(`${idProduct}.name`);

                    // create the modal
                    const modal = new ModalBuilder()
                        .setCustomId(`modalConfirm-${idProduct}`)
                        .setTitle(`📝 | ${nameP}`)

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
                        if (iModal.customId == `modalConfirm-${idProduct}`) {

                            // deferUpdate - postphone the update
                            await iModal.deferUpdate();

                            // inserted text - confirm
                            const insertedText = iModal.fields.getTextInputValue(`confirmText`)
                                .toLowerCase();

                            // checks if confirmText is equal to "sim"
                            if (insertedText == `sim`) {

                                // delete the product
                                await dbProducts.delete(idProduct);

                                // maps the panel to format products in options
                                const allPanels = dbPanels.all();

                                // promise - delete the product from the panels
                                await Promise.all(
                                    allPanels.map(async (panel) => {

                                        // get product ids
                                        const productIds = Object.keys(panel.data.products);

                                        // separates each product id
                                        for (const pId of productIds) {

                                            // checks if the product id is the same as
                                            // the id selected in the interaction
                                            if (pId == idProduct) {

                                                // delete the product from the panel
                                                await dbPanels.delete(`${panel.ID}.products.${pId}`);

                                            };

                                        };

                                    }),
                                );

                                // message - edit
                                await msg.edit({
                                    embeds: [new EmbedBuilder()
                                        .setTitle(`${client.user.username} | Produto Excluido`)
                                        .setDescription(`✅ | Produto: **${nameP}** deletado com sucesso.`)
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

                // infoProduct - button
                if (iConfig.customId == `infoProduct`) {

                    // deferUpdate - postphone the update
                    await iConfig.deferUpdate();

                    // variables with product information
                    const productSellsTotal = await dbProducts.get(`${idProduct}.sellsTotal`) || 0;
                    const productIncomeTotal = await dbProducts.get(`${idProduct}.incomeTotal`) || 0;

                    // checks if the total spent exists
                    let productRanking = `none`;
                    if (productIncomeTotal !== 0) {

                        // takes all total expenses from products in dbProducts and
                        // checks them with the product
                        const productFindId = dbProducts.all().find((product) => product.ID == idProduct);
                        const productPosition = dbProducts.all()
                            .filter((product) => product.data.incomeTotal > productFindId.data.incomeTotal).length + 1;

                        // changes the value of the variable
                        productRanking = productPosition

                    };

                    // embed - product info
                    const embedProductInfo = new EmbedBuilder()
                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                        .setTitle(`${client.user.username} | Estatísticas`)
                        .setDescription(`🛒 | Total de Vendas: **__${Number(productSellsTotal)}__**\n💸 | Rendeu: **R$__${Number(productIncomeTotal).toFixed(2)}__**\n🏆 | Posição no Rank: **${productRanking !== `none` ? `__${productRanking}°__` : `__Fora do ranking!__`}**`)
                        .setColor(`NotQuiteBlack`)
                        .setTimestamp();

                    // message - product info
                    await iConfig.followUp({
                        embeds: [embedProductInfo],
                        ephemeral: true
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