import Discord from '../Core/Discord'
import Tools from '../Core/Tools'

class Management {
    get commands() {
        return {
            'clean': {
                description: 'Cleans the last \'x\' messages that I have said in that channel for the last 100 messages.',
                permissionLevel: 1,
                pm: false,
                noPermissionsResponse: 'You require to be at least a server mod to make MeowBot clean it\'s own messages.',
                reply: true,
                handler: async (params, author, channel) => {
                    if (!params[0] || !Number(params[0])) return 'You need to give me a number of my own messages to clean!'

                    let missingRoles = Tools.checkOwnPermissions(channel.server, ['readMessageHistory'])
                    if (missingRoles) {
                        let formattedRoles = ''
                        for (let r of missingRoles) {
                            formattedRoles += `${Tools.camelToSpaced(r)}\n`
                        }
                        return `I am missing the following permissions on this server -
${'```'}${formattedRoles}${'```'}Please ensure I have a role named 'Meow' and these permissions before using the command again.`
                    }

                    let messages = await Discord.client.getChannelLogs(channel, 100)
                      , myMsgs   = messages.filter(m => m.author.equals(Discord.client.user))

                    if (myMsgs.length < 1) return 'There were no messages by me to clean up in the last 100 messages.'

                    let promises = []
                      , i = 0
                    for (let m of myMsgs) {
                        promises.push(Tools.reflect(Discord.client.deleteMessage(m)))
                        i++
                        if (i >= Number(params[0])) break
                    }

                    return Promise.all(promises)
                                  .then(res => {
                                      return `Removed ${res.filter(x => x.status === 'resolved').length} message(s) from the last 100 that I have sent.`
                                  })
                }
            }
        }
    }
}

export default new Management
