import humanizeDuration from 'humanize-duration'

import Discord from '../Core/Discord'

class Standard {
    get commands() {
        return {
            '~meowbot': {
                description: 'Basic info about bot command.',
                reply: true,
                handler: () => {
                    return 'meow meow meow! i\'m nexerq\'s little cat helper! nya!'
                }
            },
            '~uptime': {
                description: 'Returns the uptime of the bot.',
                reply: true,
                handler: () => {
                    let uptime = humanizeDuration(new Date() - Discord.aliveSince, { round: true })
                    return `MeowBot has been up, online and serving you for: ${uptime}.`
                }
            }
        }
    }
}

export default new Standard
