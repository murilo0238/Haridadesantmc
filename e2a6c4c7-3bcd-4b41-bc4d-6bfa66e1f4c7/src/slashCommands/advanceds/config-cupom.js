// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ModalBuilder, TextInputBuilder, ChannelType } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// moment - locale
const moment = require("moment");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const dbCoupons = new JsonDatabase({ databasePath: "./databases/dbCoupons.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("config-cupom")
        .setDescription("[🛠/💰] Configure um cupom de desconto!")
        .addStringOption(opString => opString
            .setName("nome")
            .setDescription("Nome do Cupom")
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
        for (const coupon of dbCoupons.all()) {
            choices.push({
                name: `Nome: ${coupon.ID} | Desconto: ${coupon.data.discount}% | Quantidade: ${coupon.data.stock}`,
                value: coupon.ID,
            });
        };
        choices.sort((a, b) => a.value - b.value);

        // search system - autocomplete
        const searchId = interaction.options.getString("nome");
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

        // name coupon
        const nameCoupon = interaction.options.getString("nome");

        // inserted coupon was not found in dbProducts (wio.db)
        if (!dbCoupons.has(nameCoupon)) {
            await interaction.reply({
                content: `❌ | ID do cupom: **${idCoupon}** não foi encontrado.`,
                ephemeral: true
            });
            return;
        };

        // guild - interaction
        const guildI = interaction.guild;
        const channelI = interaction.channel;

        // variables with coupon information
        const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
        const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
        const roleC = await dbCoupons.get(`${nameCoupon}.role`);
        const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

        // variables with information formatted for coupon use
        const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
        const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;

        // row coupon - select menu (1)
        const rowCoupon1 = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder().setCustomId(`changesConfigCoupon`).setPlaceholder(`Selecione uma opção (Cupom)`)
                    .setOptions(
                        new StringSelectMenuOptionBuilder().setLabel(`Alterar Desconto`).setEmoji(`💸`).setDescription(`Altere a porcentagem de desconto do seu cupom.`).setValue(`changeDiscount`),
                        new StringSelectMenuOptionBuilder().setLabel(`Alterar Valor Mínimo`).setEmoji(`🛒`).setDescription(`Altere o valor mínimo de compra do seu cupom.`).setValue(`changeMinimumPurchase`),
                        new StringSelectMenuOptionBuilder().setLabel(`Alterar Quantidade`).setEmoji(`📦`).setDescription(`Altere a quantidade de usos do seu cupom.`).setValue(`changeStock`),
                        new StringSelectMenuOptionBuilder().setLabel(`Alterar Cargo`).setEmoji(`👤`).setDescription(`Altere o cargo necessário para utilizar seu cupom.`).setValue(`changeRole`)
                    )
            );

        // row coupon - button (2)
        const rowCoupon2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`deleteCoupon`).setLabel(`DELETAR`).setEmoji(`🗑`).setStyle(`Danger`)
            );

        // embed coupon
        const embedCoupon = new EmbedBuilder()
            .setTitle(`${client.user.username} | Configurando Cupom`)
            .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
            .setColor(`NotQuiteBlack`)
            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

        // message - send
        await interaction.reply({
            embeds: [embedCoupon],
            components: [rowCoupon1, rowCoupon2]
        }).then(async (msg) => {

            // createMessageComponentCollector - collector
            const filter = (m) => m.user.id == interaction.user.id;
            const collectorConfig = msg.createMessageComponentCollector({
                filter: filter,
                time: 600000
            });
            collectorConfig.on("collect", async (iConfig) => {

                // changesConfigCoupon - select menu
                if (iConfig.customId == `changesConfigCoupon`) {

                    // deferUpdate - postphone the update
                    await iConfig.deferUpdate();

                    // edit the message and remove the selected option
                    await msg.edit({
                        components: [rowCoupon1, rowCoupon2]
                    });

                    // value id
                    const valueId = iConfig.values[0];

                    // changeDiscount - option
                    if (valueId == `changeDiscount`) {

                        // variables with coupon information
                        const discountC = await dbCoupons.get(`${nameCoupon}.discount`);

                        // message - edit
                        await msg.edit({
                            embeds: [new EmbedBuilder()
                                .setTitle(`${client.user.username} | Desconto`)
                                .setDescription(`Envie a porcentagem de desconto que será utilizado! \`(${discountC}%)\``)
                                .setFooter({ text: `Você tem 2 minutos para enviar.` })
                                .setColor(`NotQuiteBlack`)
                            ],
                            components: [new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`previousPageConfigsCoupon-${nameCoupon}`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                )
                            ]
                        });

                        // createMessageCollector - collector
                        const collectorMsg = channelI.createMessageCollector({
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
                                .replace(`%`, ``);

                            // is not an invalid number
                            if (isNaN(msgContent)) {

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                                // message - error
                                await iConfig.followUp({
                                    content: `❌ | O desconto inserido é inválido. Experimente utilizar o formato correto, por exemplo: **15%** ou **15**.`,
                                    ephemeral: true
                                });

                                return;
                            };

                            // set the new information in dbCoupons (wio.db)
                            await dbCoupons.set(`${nameCoupon}.discount`, msgContent);

                            // variables with coupon information
                            const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                            const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                            const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                            const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                            const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                            // variables with information formatted for coupon use
                            const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                            const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                            const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                            // embed coupon
                            const embedCoupon = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Configurando Cupom`)
                                .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                            // message - edit
                            await msg.edit({
                                embeds: [embedCoupon],
                                components: [rowCoupon1, rowCoupon2]
                            });

                        });

                        // end of time - collector (collectorMsg)
                        collectorMsg.on("end", async (c, r) => {
                            if (r == "time") {

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                            };
                        });

                        // try catch
                        try {

                            // awaitMessageComponent - collector
                            const collectorFilter = (i) => i.user.id == interaction.user.id;
                            const iAwait = await msg.awaitMessageComponent({ filter: collectorFilter, time: 120000 });

                            // previousPageConfigsAdv - button
                            if (iAwait.customId == `previousPageConfigsCoupon-${nameCoupon}`) {

                                // deferUpdate - postphone the update
                                await iAwait.deferUpdate();

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                                // stop the collector (collectorMsg)
                                await collectorMsg.stop();

                            };

                        } catch (err) {
                            return;
                        };

                    };

                    // changeMinimumPurchase - option
                    if (valueId == `changeMinimumPurchase`) {

                        // variables with coupon information
                        const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                        // variables with information formatted for coupon use
                        const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;

                        // message - edit
                        await msg.edit({
                            embeds: [new EmbedBuilder()
                                .setTitle(`${client.user.username} | Valor Mínimo`)
                                .setDescription(`Envie o valor mínimo de compra que será utilizado! \`(${minimumPurchaseFormatted})\``)
                                .setFooter({ text: `Você tem 2 minutos para enviar.` })
                                .setColor(`NotQuiteBlack`)
                            ],
                            components: [new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`removeMinimumPurchase-${nameCoupon}`).setLabel(`REMOVER`).setEmoji(`🗑`).setStyle(`Danger`),
                                    new ButtonBuilder().setCustomId(`previousPageConfigsCoupon-${nameCoupon}`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                )
                            ]
                        });

                        // createMessageCollector - collector
                        const collectorMsg = channelI.createMessageCollector({
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

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                                // message - error
                                await iConfig.followUp({
                                    content: `❌ | O valor inserido é inválido.`,
                                    ephemeral: true
                                });

                                return;
                            };

                            // set the new information in dbCoupons (wio.db)
                            await dbCoupons.set(`${nameCoupon}.minimumPurchase`, msgContent);

                            // variables with coupon information
                            const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                            const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                            const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                            const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                            const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                            // variables with information formatted for coupon use
                            const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                            const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                            const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                            // embed coupon
                            const embedCoupon = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Configurando Cupom`)
                                .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                            // message - edit
                            await msg.edit({
                                embeds: [embedCoupon],
                                components: [rowCoupon1, rowCoupon2]
                            });

                        });

                        // end of time - collector (collectorMsg)
                        collectorMsg.on("end", async (c, r) => {
                            if (r == "time") {

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                            };
                        });

                        // try catch
                        try {

                            // awaitMessageComponent - collector
                            const collectorFilter = (i) => i.user.id == interaction.user.id;
                            const iAwait = await msg.awaitMessageComponent({ filter: collectorFilter, time: 120000 });

                            // removeMinimumPurchase - button
                            if (iAwait.customId == `removeMinimumPurchase-${nameCoupon}`) {

                                // deferUpdate - postphone the update
                                await iAwait.deferUpdate();

                                // remove the information by dbCoupons (wio.db)
                                await dbCoupons.set(`${nameCoupon}.minimumPurchase`, 0);

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                                // stop the collector (collectorMsg)
                                await collectorMsg.stop();

                            };

                            // previousPageConfigsAdv - button
                            if (iAwait.customId == `previousPageConfigsCoupon-${nameCoupon}`) {

                                // deferUpdate - postphone the update
                                await iAwait.deferUpdate();

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                                // stop the collector (collectorMsg)
                                await collectorMsg.stop();

                            };

                        } catch (err) {
                            return;
                        };

                    };

                    // changeStock - option
                    if (valueId == `changeStock`) {

                        // variables with coupon information
                        const stockC = await dbCoupons.get(`${nameCoupon}.stock`);

                        // message - edit
                        await msg.edit({
                            embeds: [new EmbedBuilder()
                                .setTitle(`${client.user.username} | Quantidade`)
                                .setDescription(`Envie a quantidade de usos que será utilizada! \`(${stockC})\``)
                                .setFooter({ text: `Você tem 2 minutos para enviar.` })
                                .setColor(`NotQuiteBlack`)
                            ],
                            components: [new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`removeStock-${nameCoupon}`).setLabel(`REMOVER`).setEmoji(`🗑`).setStyle(`Danger`),
                                    new ButtonBuilder().setCustomId(`previousPageConfigsCoupon-${nameCoupon}`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                )
                            ]
                        });

                        // createMessageCollector - collector
                        const collectorMsg = channelI.createMessageCollector({
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

                            // is not an invalid number
                            if (isNaN(msgContent)) {

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                                // message - error
                                await iConfig.followUp({
                                    content: `❌ | A quantidade inserida é inválida.`,
                                    ephemeral: true
                                });

                                return;
                            };

                            // set the new information in dbCoupons (wio.db)
                            await dbCoupons.set(`${nameCoupon}.stock`, msgContent);

                            // variables with coupon information
                            const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                            const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                            const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                            const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                            const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                            // variables with information formatted for coupon use
                            const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                            const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                            const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                            // embed coupon
                            const embedCoupon = new EmbedBuilder()
                                .setTitle(`${client.user.username} | Configurando Cupom`)
                                .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                .setColor(`NotQuiteBlack`)
                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                            // message - edit
                            await msg.edit({
                                embeds: [embedCoupon],
                                components: [rowCoupon1, rowCoupon2]
                            });

                        });

                        // end of time - collector (collectorMsg)
                        collectorMsg.on("end", async (c, r) => {
                            if (r == "time") {

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                            };
                        });

                        // try catch
                        try {

                            // awaitMessageComponent - collector
                            const collectorFilter = (i) => i.user.id == interaction.user.id;
                            const iAwait = await msg.awaitMessageComponent({ filter: collectorFilter, time: 120000 });

                            // removeStock - button
                            if (iAwait.customId == `removeStock-${nameCoupon}`) {

                                // deferUpdate - postphone the update
                                await iAwait.deferUpdate();

                                // remove the information by dbCoupons (wio.db)
                                await dbCoupons.set(`${nameCoupon}.stock`, 0);

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                                // stop the collector (collectorMsg)
                                await collectorMsg.stop();

                            };

                            // previousPageConfigsAdv - button
                            if (iAwait.customId == `previousPageConfigsCoupon-${nameCoupon}`) {

                                // deferUpdate - postphone the update
                                await iAwait.deferUpdate();

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                                // stop the collector (collectorMsg)
                                await collectorMsg.stop();

                            };

                        } catch (err) {
                            return;
                        };

                    };

                    // changeRole - option
                    if (valueId == `changeRole`) {

                        // variables with coupon information
                        const roleC = await dbCoupons.get(`${nameCoupon}.role`);

                        // variables with information formatted for coupon use
                        const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;

                        // message - edit
                        await msg.edit({
                            embeds: [new EmbedBuilder()
                                .setTitle(`${client.user.username} | Cargo`)
                                .setDescription(`Selecione o cargo que será utilizado ou clique no botão abaixo para remover! (${roleFormatted})`)
                                .setFooter({ text: `Você tem 2 minutos para selecionar.` })
                                .setColor(`NotQuiteBlack`)
                            ],
                            components: [new ActionRowBuilder()
                                .addComponents(
                                    new RoleSelectMenuBuilder().setCustomId(`selectRoleMenu`).setPlaceholder(`Selecione um Cargo`)
                                ), new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`removeRole-${nameCoupon}`).setLabel(`REMOVER`).setEmoji(`🗑`).setStyle(`Danger`),
                                        new ButtonBuilder().setCustomId(`previousPageConfigsCoupon-${nameCoupon}`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
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
                                await dbCoupons.set(`${nameCoupon}.role`, valueId);

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                            };

                            // removeRole - button
                            if (iAwait.customId == `removeRole-${nameCoupon}`) {

                                // deferUpdate - postphone the update
                                await iAwait.deferUpdate();

                                // remove the information by dbCoupons (wio.db)
                                await dbCoupons.set(`${nameCoupon}.role`, `none`);

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                            };

                            // previousPageConfigsAdv - button
                            if (iAwait.customId == `previousPageConfigsCoupon-${nameCoupon}`) {

                                // deferUpdate - postphone the update
                                await iAwait.deferUpdate();

                                // variables with coupon information
                                const discountC = await dbCoupons.get(`${nameCoupon}.discount`);
                                const stockC = await dbCoupons.get(`${nameCoupon}.stock`);
                                const roleC = await dbCoupons.get(`${nameCoupon}.role`);
                                const categoryC = await dbCoupons.get(`${nameCoupon}.category`);
                                const minimumPurchaseC = await dbCoupons.get(`${nameCoupon}.minimumPurchase`);

                                // variables with information formatted for coupon use
                                const minimumPurchaseFormatted = minimumPurchaseC != 0 ? `R$${Number(minimumPurchaseC).toFixed(2)}` : `Qualquer valor.`;
                                const roleFormatted = roleC != "none" ? guildI.roles.cache.get(roleC) || `\`${roleC} não encontrado.\`` : `\`Qualquer usuário.\``;
                                const categoryFormatted = categoryC != "none" ? guildI.channels.cache.get(categoryC) || `\`${categoryC} não encontrado.\`` : `\`Qualquer produto.\``;

                                // embed coupon
                                const embedCoupon = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Configurando Cupom`)
                                    .setDescription(`**📝 | Nome: \`${nameCoupon}\`\n💸 | Desconto: \`${discountC}%\`\n🛒 | Valor Mínimo: \`${minimumPurchaseFormatted}\`\n📦 | Quantidade: \`${stockC}\`\n\n👤 | Disponível apenas para o cargo: ${roleFormatted}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedCoupon],
                                    components: [rowCoupon1, rowCoupon2]
                                });

                            };

                        } catch (err) {
                            return;
                        };

                    };

                };

                // deleteCoupon - button
                if (iConfig.customId == `deleteCoupon`) {

                    // delete the coupon from dbCoupons (wio.db)
                    await dbCoupons.delete(nameCoupon);

                    // create the modal
                    const modal = new ModalBuilder()
                        .setCustomId(`modalConfirm-${nameCoupon}`)
                        .setTitle(`📝 | ${nameCoupon}`)

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
                        if (iModal.customId == `modalConfirm-${nameCoupon}`) {

                            // deferUpdate - postphone the update
                            await iModal.deferUpdate();

                            // inserted text - confirm
                            const insertedText = iModal.fields.getTextInputValue(`confirmText`)
                                .toLowerCase();

                            // checks if confirmText is equal to "sim"
                            if (insertedText == `sim`) {

                                // delete the coupon
                                await dbCoupons.delete(nameCoupon);

                                // message - edit
                                await msg.edit({
                                    embeds: [new EmbedBuilder()
                                        .setTitle(`${client.user.username} | Cupom Excluido`)
                                        .setDescription(`✅ | Cupom: **${nameCoupon}** deletado com sucesso.`)
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