const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createAudioRecorder } = require('@kirdock/discordjs-voice-recorder');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clipar')
        .setDescription('Grava os últimos 1 minuto de áudio da call')
        .addIntegerOption(option =>
            option.setName('segundos')
                .setDescription('Número de segundos para gravar (padrão: 60)')
                .setMinValue(10)
                .setMaxValue(120)
        ),

    async execute(interaction) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            await interaction.reply({
                content: '❌ Você precisa estar em um canal de voz para usar este comando!',
                ephemeral: true
            });
            return;
        }

        const botMember = interaction.guild.members.me;
        const permissions = voiceChannel.permissionsFor(botMember);
        
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            await interaction.reply({
                content: '❌ Eu não tenho permissão para entrar no seu canal de voz!',
                ephemeral: true
            });
            return;
        }

        await interaction.reply({
            content: '🎙️ Conectando ao canal de voz e preparando gravação...',
            ephemeral: true
        });

        try {
            const seconds = interaction.options.getInteger('segundos') || 60;
            
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: true
            });

            const recorder = createAudioRecorder(connection, {
                mode: 'replay',
                replayLength: seconds * 1000,
                silenceThreshold: -50
            });

            await recorder.startRecording();
            await new Promise(resolve => setTimeout(resolve, seconds * 1000 + 1000));
            const audioData = await recorder.stopRecording();

            const tempDir = path.join(__dirname, '..', '..', 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const fileName = `clip_${Date.now()}_${interaction.user.username}.mp3`;
            const filePath = path.join(tempDir, fileName);
            fs.writeFileSync(filePath, audioData);

            const stats = fs.statSync(filePath);
            const fileSizeMB = stats.size / 1024 / 1024;

            if (fileSizeMB > 25) {
                fs.unlinkSync(filePath);
                await interaction.editReply({
                    content: `❌ O áudio ficou muito grande (${fileSizeMB.toFixed(2)}MB). Tente um período menor.`
                });
                
                const connection = getVoiceConnection(interaction.guildId);
                if (connection) {
                    connection.destroy();
                }
                return;
            }

            await interaction.editReply({
                content: `✅ Áudio dos últimos ${seconds} segundos gravado com sucesso!\n📊 Tamanho: ${fileSizeMB.toFixed(2)}MB`,
                files: [{
                    attachment: filePath,
                    name: fileName
                }]
            });

            setTimeout(() => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Arquivo removido: ${fileName}`);
                }
            }, 5000);

            setTimeout(() => {
                const connection = getVoiceConnection(interaction.guildId);
                if (connection) {
                    connection.destroy();
                    console.log('🔌 Desconectado do canal de voz por inatividade');
                }
            }, 30000);

        } catch (error) {
            console.error('❌ Erro ao gravar áudio:', error);
            
            try {
                const connection = getVoiceConnection(interaction.guildId);
                if (connection) {
                    connection.destroy();
                }
            } catch (e) {}

            await interaction.editReply({
                content: `❌ Ocorreu um erro ao gravar o áudio: ${error.message}`
            });
        }
    }
};
