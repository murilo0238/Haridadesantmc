// discord.js
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// fs - files
const { writeFile, unlink } = require("node:fs");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbProducts = new JsonDatabase({ databasePath: "./databases/dbProducts.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("entregar")
        .setDescription("[🛠/💰] Entregue um produto para um usuário!")
        .addStringOption(opString => opString
            .setName("id")
            .setDescription("ID do Produto")
            .setMaxLength(25)
            .setAutocomplete(true)
            .setRequired(true)
        )
        .addUserOption(opUser => opUser
            .setName(`usuário`)
            .setDescription(`Selecione um usuário`)
            .setRequired(true)
        )
        .addIntegerOption(opInteger => opInteger
            .setName(`unidade`)
            .setDescription(`Quantia de itens que será entregue`)
            .setMaxValue(100)
            .setMinValue(1)
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

        // variables with the information entered
        const idProduct = interaction.options.getString("id");
        const userProduct = interaction.options.getUser("usuário");
        const quantityItems = interaction.options.getInteger("unidade");

        // inserted product was not found in dbProducts (wio.db)
        if (!dbProducts.has(idProduct)) {
            await interaction.reply({
                content: `❌ | ID do produto: **${idProduct}** não foi encontrado.`,
                ephemeral: true
            });
            return;
        };

        // message - loading
        await interaction.reply({
            content: `🔁 | Enviando produto(s) ...`,
            ephemeral: true
        }).then(async (msg) => {

            // variables with product information in the cart by dbProducts (wio.db)
            const nameP = await dbProducts.get(`${idProduct}.name`);
            const estoqueP = await dbProducts.get(`${idProduct}.stock`);

            // checks if the product is in stock
            if (estoqueP.length < 1) {
                await interaction.editReply({
                    content: `❌ | Este produto está sem estoque.`,
                    ephemeral: true
                });
                return;

            } else if (estoqueP.length < Number(quantityItems)) {
                await interaction.editReply({
                    content: `❌ | Este produto tem apenas **${estoqueP.length}** itens em estoque.`,
                    ephemeral: true
                });
                return;
            };

            // separate the items - product
            const purchasedItems = await estoqueP.splice(0, Number(quantityItems));

            // push variable with items purchased (txt)
            let itensRemoved = ``;
            for (let i = 0; i < purchasedItems.length; i++) {
                itensRemoved += `\n📦 | Entrega do Produto: ${nameP} - ${i + 1}/${Number(quantityItems)}\n${purchasedItems[i]}\n`;
            };

            // embed - product
            const embedProduct = new EmbedBuilder()
                .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                .setTitle(`${client.user.username} | Entrega`)
                .addFields(
                    { name: `🌎 | Produto(s) Entregue(s):`, value: `${nameP} x${quantityItems}` },
                    { name: `👤 | Entregue por:`, value: `${interaction.user} | ${interaction.user.username}` }
                )
                .setColor(`NotQuiteBlack`)
                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })

            // sends a message to the user notifying them of the items received
            await userProduct.send({
                content: `${userProduct}`,
                embeds: [embedProduct]
            }).then(async (msg) => {

                // checks if the number of products is less than or equal to 7
                if (Number(quantityItems) <= 7) {

                    // user - message - success - itens
                    await userProduct.send({
                        content: `${itensRemoved}`
                    }).catch((async (err) => {

                        // file name
                        const fileName = `${nameP}.txt`;

                        // create the file and add the content
                        writeFile(fileName, itensRemoved, (err) => {
                            if (err) throw err;
                        });

                        // create the attachment
                        const fileAttachment = new AttachmentBuilder(fileName);

                        // user - message - success - itens
                        await userProduct.send({
                            files: [fileAttachment]
                        }).then((msg) => {

                            // delete the file
                            unlink(fileName, (err) => {
                                if (err) throw err;
                            });

                        });

                    }));

                } else {

                    // file name
                    const fileName = `${nameP}.txt`;

                    // create the file and add the content
                    writeFile(fileName, itensRemoved, (err) => {
                        if (err) throw err;
                    });

                    // create the attachment
                    const fileAttachment = new AttachmentBuilder(fileName);

                    // user - message - success - itens
                    await userProduct.send({
                        files: [fileAttachment]
                    }).then((msg) => {

                        // delete the file
                        unlink(fileName, (err) => {
                            if (err) throw err;
                        });

                    });

                };

                // remove itens de produtos por dbProducts (wio.db)
                await dbProducts.set(`${idProduct}.stock`, estoqueP);

                // message - edit - success
                await interaction.editReply({
                    content: `✅ | Produto(s) enviado(s) com sucesso para a DM do usuário ${userProduct}.`,
                    ephemeral: true
                });

            }).catch(async (err) => {

                // log
                await console.error(err);

                // message - edit - error
                await interaction.editReply({
                    content: `❌ | Ocorreu um erro ao enviar o produto na DM do usuário ${userProduct}.`,
                    ephemeral: true
                });

            });

        });

    },
};