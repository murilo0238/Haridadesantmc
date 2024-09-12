// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("[🔧] Veja todos os meus comandos!")
        .setDMPermission(false),

    // execute (command)
    async execute(interaction, client) {

        // row - help
        const rowHelp = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`advancedCommands`).setLabel(`Comandos Avançados`).setEmoji(`⚙`).setStyle(`Primary`)
            );

        // embed - help
        const embedHelp = new EmbedBuilder()
            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
            .setTitle(`${client.user.username} | Comandos de Uso Livre`)
            .addFields(
                { name: `⚙ /help`, value: `\`Exibe está mensagem.\`` },
                { name: `⚙ /adicionar-saldo`, value: `\`Adicione saldo no BOT via Pix.\`` },
                { name: `⚙ /cleardm`, value: `\`Limpa a DM do BOT caso haja mensagens.\`` },
                { name: `⚙ /rank`, value: `\`Veja o rank dos usuários que mais compraram.\`` },
                { name: `⚙ /resgatar-gift`, value: `\`Resgate um GiftCard.\`` },
            )
            .setColor(`NotQuiteBlack`)
            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

        // reply - init
        await interaction.reply({
            embeds: [embedHelp],
            components: [rowHelp]
        }).then(async (msg) => {

            // createMessageComponentCollector - collector
            const filter = (i) => i.user.id == interaction.user.id;
            const collectorHelp = msg.createMessageComponentCollector({
                filter: filter,
                time: 600000
            });
            collectorHelp.on("collect", async (iHelp) => {

                // advancedCommands - button - init
                if (iHelp.customId == `advancedCommands`) {

                    // user without permission for dbPerms (wio.db)
                    if (!dbPerms.has(interaction.user.id)) {
                        await iHelp.followUp({
                            content: `❌ | Você não tem permissão para ver os comandos avançados.`,
                            ephemeral: true
                        });
                        return;
                    };

                    // row - help
                    const rowHelp = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`publicCommands`).setLabel(`Comandos de Uso Livre`).setEmoji(`⚙`).setStyle(`Success`)
                        );

                    // embed - help
                    const embedHelp = new EmbedBuilder()
                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                        .setTitle(`${client.user.username} | Comandos Avançados`)
                        .addFields(
                            { name: `⚙ /gerenciar`, value: `\`Gerencie as configurações do BOT.\`` },
                            { name: `⚙ /administrar-saldo`, value: `\`Gerencie o saldo de algum usuário.\`` },
                            { name: `⚙ /conectar \`[Canal]\``, value: `\`Conecte o BOT em um canal de voz.\`` },
                            { name: `⚙ /config-cupom \`[Nome]\``, value: `\`Configure um cupom de desconto.\`` },
                            { name: `⚙ /config \`[ID/Produto]\``, value: `\`Configure um produto.\`` },
                            { name: `⚙ /config-painel \`[ID/Painel]\``, value: `\`Configure um painel de produtos.\`` },
                            { name: `⚙ /criados`, value: `\`Veja todos os itens cadastrados.\`` },
                            { name: `⚙ /criar-cupom \`[Nome]\``, value: `\`Cadastre um novo cupom de desconto.\`` },
                            { name: `⚙ /criar-gift`, value: `\`Cadastre um novo GiftCard com valor.\`` },
                            { name: `⚙ /criar \`[ID/Produto]\``, value: `\`Cadastre um novo produto.\`` },
                            { name: `⚙ /criar-painel \`[ID/Painel] [ID/Produto]\``, value: `\`Cadastre um novo painel de produtos em select menu.\`` },
                            { name: `⚙ /dm \`[Usuário] [Mensagem]\` `, value: `\`Envie uma mensagem privada para algum usuário.\`` },
                            { name: `⚙ /entregar \`[ID/Produto] [Usuário] [Unidade]\``, value: `\`Entregue um produto para um usuário.\`` },
                            { name: `⚙ /estatísticas`, value: `\`Veja as estatisticas do BOT.\`` },
                            { name: `⚙ /gerar-pix \`[Valor]\``, value: `\`Gere uma cobrança via Pix.\`` },
                            { name: `⚙ /pegar \`[ID/Pedido]\``, value: `\`Mostra os itens entregues de uma compra pelo ID.\`` },
                            { name: `⚙ /perfil \`[Usuário/Opcional]\``, value: `\`Veja o perfil de compras de algum usuário.\`` },
                            { name: `⚙ /rank-adm`, value: `\`Veja o rank dos usuários que mais compraram.\`` },
                            { name: `⚙ /rank-produtos`, value: `\`Veja o rank dos produtos que mais foram vendidos.\`` },
                            { name: `⚙ /say \`[Mensagem]\``, value: `\`Faça o BOT enviar uma mensagem.\`` },
                            { name: `⚙ /set \`[ID/Produto]\``, value: `\`Sete a mensagem de compra.\`` },
                            { name: `⚙ /set-painel \`[ID/Painel]\``, value: `\`Sete a mensagem de compra de um painel com select menu.\`` },
                            { name: `⚙ /status \`[ID/Pagamento]\``, value: `\`Verifique o status de um pagamento.\`` },
                            { name: `⚙ /stock-id \`[ID/Produto]\``, value: `\`Veja o estoque de um produto.\`` },
                            { name: `⚙ /add-perm`, value: `\`Dê permissão para algum usuário usar minhas funções.\`` },
                            { name: `⚙ /remove-perm`, value: `\`Remova permissão de algum usuário.\`` },
                            { name: `⚙ /users-perm`, value: `\`Veja os usuários que tem permissão para usar minhas funções.\`` }
                        )
                        .setColor(`NotQuiteBlack`)
                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

                    // message - edit
                    await iHelp.update({
                        embeds: [embedHelp],
                        components: [rowHelp]
                    });

                };

                // publicCommands - button - global
                if (iHelp.customId == `publicCommands`) {

                    // message - edit
                    await iHelp.update({
                        embeds: [embedHelp],
                        components: [rowHelp]
                    });

                };

            });

        });

    },
};