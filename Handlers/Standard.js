import humanizeDuration from 'humanize-duration'

import Config from '../Core/Config'
import Discord from '../Core/Discord'
import Handlers from '../Core/Handlers'
import Tools from '../Core/Tools'
import Logging from '../Core/Logging'

class Standard {
    get commands() {
        return {
            'meowbot': {
                description: 'Basic info about bot command.',
                handler: () => {
                    return 'MeowBot v2. Another open-source, random Discord bot, made by Nexerq. Source code: https://github.com/nicholastay/meowbot-discord-v2.'
                }
            },
            'uptime': {
                description: 'Returns the uptime of the bot.',
                handler: () => {
                    let uptime = humanizeDuration(new Date() - Discord.aliveSince, { round: true })
                    return `MeowBot has been up, online and serving you for: ${uptime}.`
                }
            },
            'help': {
                description: 'Shows the help description for a command.',
                handler: (params) => {
                    if (!params[0]) {
                        let commands = []
                        for (let k in Handlers.commands) {
                            if (!Handlers.commands[k].hidden && !Handlers.commands[k]._alias) commands.push(`\`${k}\``)
                        }
                        return `Commands I have: ${commands.join(', ')}\n*(use \`help [command]\` to get help for an individual command.)*`
                    }

                    let command = params[0]
                    if (Handlers.commands[command] && Handlers.commands[command]._alias) command = Handlers.commands[command]._alias // alias redir
                    if (!Handlers.commands[command] || Handlers.commands[command].hidden) return `There is no such command as '${params[0]}'` // act dumb on a hidden command :P

                    let aliases = null
                    if (Handlers.commands[command].alias) {
                        aliases = ''
                        for (let a of Handlers.commands[command].alias) aliases += ` ${a}`
                    }

                    let permissions = null
                    if (Handlers.commands[command].permissionLevel) {
                        switch(Handlers.commands[command].permissionLevel) {
                            case 1:
                                permissions = 'Server Mod'; break
                            case 2:
                                permissions = 'Server Admin'; break
                            case 3:
                                permissions = 'MeowBot Admin'; break
                        }
                    }

                    return `\`${command}\`: \`${Handlers.commands[command].description}${aliases ? ` (aliases:${aliases})` : ''}\`${permissions ? `*(You must have at least '${permissions}' permission to use this command.)*\n` : ''}${Handlers.commands[command].blockPM ? '*[You cannot use this command in a private message.]*' : ''}${Handlers.commands[command].blockGeneral ? '*[You can only use this command in a private message.]*' : ''}`
                }
            },
            'join': {
                description: 'Bot join server information over PM only.',
                reply: true,
                blockGeneral: true,
                handler: (params) => {
                    if (Discord.client.user.bot && !Config.discord.oauthId) {
                        Logging.mlog('StandardM', 'A user is trying to make bot join their server! Please set discord.oauthId in your config with your bot\'s OAuth ID!')
                        return 'Hi! Unfortunately currently there is no way to get MeowBot to join your own server, please check back another time!~ meow!'
                    }

                    let generalMsg = '\nSome general info: The general roles that MeowBot uses are *MeowMods* and *MeowAdmins*. You should make these two roles and add server admins to the *MeowAdmins* role, and any server mods to the other. The server owner (*probably* you), will always have access any MeowAdmins permissions. These roles give certain permissions in the bot to these users to do certain things. For certain commands you may also need to give these roles certain permissions for them to function properly.'
                    if (!Discord.client.user.bot) {
                        if (!params[1]) return 'You must provide an invite ID/URL for me to join!...'
                        return Discord.client.joinServer(params[1])
                                             .then(server => { return `Joined your server - ${server.name} (${server.id}) <Owned by ${server.owner.username}#${server.owner.discriminator}>\n${generalMsg}` })
                    }

                    return `To allow me access to your server, please use this link! - https://discordapp.com/oauth2/authorize?scope=bot&client_id=${Config.discord.oauthId}\n${generalMsg}`
                }
            },
            'serverinfo': {
                description: 'Returns information about the server the message was issued on.',
                blockPM: true,
                handler: (params, author, channel, server) => {
                    return `Here's some info about this server:
\`\`\`
Name: ${server.name}
ID: ${server.id}
Region: ${server.region}
Owner: ${server.owner.username} (#${server.owner.discriminator}) <${server.owner.id}>
Members: Aware of ${server.members.length} members.
Roles: Aware of ${server.roles.length} roles.
\`\`\``
                }
            },
            'userinfo': {
                description: 'Returns information about a user on the server it was issued on. Defaults to the person who wrote the message.',
                blockPM: true,
                handler: (params, author) => {
                    let user = author // default
                    if (params[0]) {
                        user = Tools.resolveMention(params[0])
                        if (!user) return 'Invalid user, please mention them properly.'
                    }

                    return `Some information I know about ${(user.id === author.id) ? 'you' : 'that user'}:
\`\`\`
Name: ${user.username}
User ID: ${user.id}
Discriminator: #${user.discriminator}
Avatar: ${user.avatarURL}
Bot?: ${user.bot ? 'Yes' : 'No'}
Status: ${user.status}${user.game ? ` (playing ${user.game.name || user.game})` : ''}
\`\`\``
                }
            }
        }
    }
}

export default new Standard
