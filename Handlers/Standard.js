import humanizeDuration from 'humanize-duration'

import Config from '../Core/Config'
import Discord from '../Core/Discord'
import Handlers from '../Core/Handlers'
import Logging from '../Core/Logging'

class Standard {
    get commands() {
        return {
            'meowbot': {
                description: 'Basic info about bot command.',
                reply: true,
                handler: () => {
                    return 'meow meow meow! i\'m nexerq\'s little cat helper! nya!'
                }
            },
            'uptime': {
                description: 'Returns the uptime of the bot.',
                reply: true,
                handler: () => {
                    let uptime = humanizeDuration(new Date() - Discord.aliveSince, { round: true })
                    return `MeowBot has been up, online and serving you for: ${uptime}.`
                }
            },
            'help': {
                description: 'Shows the help description for a command.',
                handler: (params) => {
                    if (!params[0]) return

                    let cmd = params[0].replace(Config.prefix, '')

                    if (!params[0].startsWith(Config.prefix) || !Handlers.commands[cmd]) return `There is no such command as '${params[0]}'`
                    return `${'`'}${params[0]}${'`'}: ${'`'}${Handlers.commands[cmd].description}${'`'}`
                }
            },
            'join': {
                description: 'Bot join server information over PM only.',
                reply: true,
                general: false,
                handler: (params) => {
                    if (Discord.client.user.bot && !Config.discord.oauthId) {
                        Logging.mlog('StandardM', 'A user is trying to make bot join their server! Please set discord.oauthId in your config with your bot\'s OAuth ID!')
                        return 'Hi! Unfortunately currently there is no way to get MeowBot to join your own server, please check back another time!~ meow!'
                    }

                    let generalMsg = '\nSome general info: The general roles that MeowBot uses are *MeowMods* and *MeowAdmins*. You should make these two roles add yourself to the *MeowAdmins* role, and any server mods to the other. These roles give certain permissions in the bot to these users to do certain things. For certain commands you may also need to give these roles certain permissions for them to function properly.'
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
                pm: false,
                handler: (params, author, channel) => {
                    return `Here's some info about this server:
${'```'}
Name: ${channel.server.name}
ID: ${channel.server.id}
Region: ${channel.server.region}
Owner: ${channel.server.owner.username} (#${channel.server.owner.discriminator}) <${channel.server.owner.id}>
Members: Aware of ${channel.server.members.length} members.
Roles: Aware of ${channel.server.roles.length} roles.
${'```'}`
                }
            },
            'userinfo': {
                description: 'Returns information about a user on the server it was issued on.',
                pm: false,
                handler: (params, author, channel) => {
                    let user = author // default
                    if (params[0]) {
                        user = channel.server.members.get('name', params.join(' '))
                        if (!user) return `I do not know of a user called ${params.join(' ')} on this server.`
                    }

                    return `Some information I know about ${user.equals(author) ? 'you' : 'that user'}:
${'```'}
Name: ${user.username}
User ID: ${user.id}
Discriminator: #${user.discriminator}
Avatar: ${user.avatarURL}
Bot?: ${user.bot ? 'Yes' : 'No'}
Status: ${user.status}${user.game ? ` (playing ${user.game.name})` : ''}
${'```'}`
                }
            }
        }
    }
}

export default new Standard
