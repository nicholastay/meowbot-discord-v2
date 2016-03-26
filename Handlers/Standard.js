import humanizeDuration from 'humanize-duration'

import Discord from '../Core/Discord'

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
            'join': {
                description: 'Bot join server information over PM only.',
                reply: true,
                general: false,
                handler: () => {
                    return 'Hi! Unfortunately currently there is no way to get MeowBot to join your own server, please check back another time!~ meow!'
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
            }
        }
    }
}

export default new Standard
