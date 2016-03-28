import Discord from '../Core/Discord'
import Tools from '../Core/Tools'

class Management {
    get commands() {
        return {
            'setcolor': {
                description: 'Sets the color of a role to a hex color. (Usage: setcolor [hex code] [role name])',
                permissionLevel: 1,
                blockPM: true,
                noPermissionsResponse: 'You require to at least be a server mod to set a role\'s hex color.',
                reply: true,
                handler: (params, author, channel) => {
                    if (!params[0] || !params[1]) return 'You must specify a hex color and a role name for me to change the color of!'
                    if (!/^#?[A-Fa-f0-9]{6}$/.test(params[0])) return 'Invalid hex color specified.'

                    let missingPerms = Tools.checkOwnPermissions(channel.server, ['manageRoles'])
                    if (missingPerms) return fancyPrintPerms(missingPerms)

                    let color    = parseInt(params.shift().replace('#', ''), 16)
                      , roleName = params.join(' ')
                      , role     = channel.server.roles.get('name', roleName)
                    if (!role) return 'Invalid role specified for this server.'

                    return Discord.client.updateRole(role, { color })
                                         .then(() => { return 'Updated the role\'s color successfully.' })
                }
            },
            'setusercolor': {
                description: 'Sets the color of a user to a hex color. Leave the user blank to set own. (Warning: spams roles on the server for each user! as such, only server admins can use this command.)',
                permissionLevel: 2,
                blockPM: true,
                noPermissionsResponse: 'You require to at least be a server admin to set a user\'s hex color. *(This is due to the role spam created)*',
                reply: true,
                handler: async (params, author, channel) => {
                    if (!params[0]) return 'You must specify a hex color and optionally, a user\'s name for me to change the color of!'
                    if (!/^#?[A-Fa-f0-9]{6}$/.test(params[0])) return 'Invalid hex color specified.'

                    let missingPerms = Tools.checkOwnPermissions(channel.server, ['manageRoles'])
                    if (missingPerms) return fancyPrintPerms(missingPerms)

                    let color = parseInt(params.shift().replace('#', ''), 16)
                      , user  = author
                    if (params[0]) {
                        user = channel.server.members.get('name', params.join(' '))
                        if (!user) return 'Invalid user name specified!'
                    }

                    let existingRole = channel.server.roles.get('name', new RegExp(`\\(MeowColors#${user.id}\\)$`))
                    if (existingRole) {
                        // Update it
                        return Discord.client.updateRole(existingRole, { color })
                                             .then(() => { return 'Updated the user\'s color successfully.' })
                    } else {
                        // Create it
                        let role = await Discord.client.createRole(channel.server, {
                            color,
                            name: `${user.name} (MeowColors#${user.id})`
                        })
                        return Discord.client.addMemberToRole(user, role)
                                             .then(() => { return 'User\'s color successfully set. *(A new role for this user was created and they were added to it.)*' })
                    }
                }
            },
            'clean': {
                description: 'Cleans the last \'x\' messages that I have said in that channel for the last 100 messages.',
                permissionLevel: 1,
                blockPM: true,
                noPermissionsResponse: 'You require to be at least a server mod to make MeowBot clean it\'s own messages.',
                reply: true,
                handler: async (params, author, channel) => {
                    if (!params[0] || !Number(params[0])) return 'You need to give me a number of my own messages to clean!'

                    let missingPerms = Tools.checkOwnPermissions(channel.server, ['readMessageHistory'])
                    if (missingPerms) return fancyPrintPerms(missingPerms)

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
                                  .then(res => { return `Removed ${res.filter(x => x.status === 'resolved').length} message(s) from the last 100 that I have sent.` })
                }
            },
            'prune': {
                description: 'Prunes the last \'x\' message from the channel.',
                permissionLevel: 1,
                blockPM: true,
                noPermissionsResponse: 'You require to be at least a server mod to make MeowBot clean the channel\'s messages.',
                retry: true,
                handler: async (params, author, channel) => {
                    if (!params[0] || !Number(params[0])) return 'You need to give me a number of messages to prune!'

                    let missingPerms = Tools.checkOwnPermissions(channel.server, ['readMessageHistory', 'manageMessages'])
                    if (missingPerms) return fancyPrintPerms(missingPerms)

                    let toPrune = Number(params[0])
                    if (toPrune > 100) return 'The maximum I can prune at a time is 100 messages. Please lower the number and try again.'

                    let messages = await Discord.client.getChannelLogs(channel, toPrune + 1) // dont count or prune the prune command hehe
                      , promises = []

                    messages.shift() // disregard command
                    for (let m of messages) promises.push(Tools.reflect(Discord.client.deleteMessage(m)))
                    return Promise.all(promises)
                                  .then(res => { return `Pruned the last ${res.filter(x => x.status === 'resolved').length} messages(s).` })
                }
            }
        }
    }
}

function fancyPrintPerms(missingPerms) {
    let formatted = ''
    for (let r of missingPerms) {
        formatted += `${Tools.camelToSpaced(r)}\n`
    }
    return `I am missing the following permissions on this server -
\`\`\`${formatted}\`\`\`Please ensure I have a role named 'Meow' and these permissions before using the command again.`
}

export default new Management
