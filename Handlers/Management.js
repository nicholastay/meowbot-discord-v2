import Discord from '../Core/Discord'
import Database from '../Core/Database'
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
                handler: (params, author, channel, server) => {
                    if (!params[0] || !params[1]) return 'You must specify a hex color and a role name for me to change the color of!'
                    if (!/^#?[A-Fa-f0-9]{6}$/.test(params[0])) return 'Invalid hex color specified.'

                    let missingPerms = Tools.checkOwnPermissions(server, ['manageRoles'])
                    if (missingPerms) return fancyPrintPerms(missingPerms)

                    let color    = parseInt(params.shift().replace('#', ''), 16)
                      , roleName = params.join(' ')
                      , role     = server.roles.get('name', roleName)
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
                handler: async (params, author, channel, server) => {
                    if (!params[0]) return 'You must specify a hex color and optionally, a user\'s name for me to change the color of!'
                    if (!/^#?[A-Fa-f0-9]{6}$/.test(params[0])) return 'Invalid hex color specified.'

                    let missingPerms = Tools.checkOwnPermissions(server, ['manageRoles'])
                    if (missingPerms) return fancyPrintPerms(missingPerms)

                    let color = parseInt(params.shift().replace('#', ''), 16)
                      , user  = author
                    if (params[0]) {
                        user = Tools.resolveMention(params[0])
                        if (!user) return 'Invalid user specified! You must mention the user in this argument.'
                    }

                    let existingRole = server.roles.get('name', new RegExp(`\\(MeowColors#${user.id}\\)$`))
                    if (existingRole) {
                        // Update it
                        return Discord.client.updateRole(existingRole, { color })
                                             .then(() => { return 'Updated the user\'s color successfully.' })
                    } else {
                        // Create it
                        let role = await Discord.client.createRole(server, {
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
                handler: async (params, author, channel, server) => {
                    if (!params[0] || !Number(params[0])) return 'You need to give me a number of my own messages to clean!'

                    let missingPerms = Tools.checkOwnPermissions(server, ['readMessageHistory'])
                    if (missingPerms) return fancyPrintPerms(missingPerms)

                    let messages = await Discord.client.getChannelLogs(channel, 100)
                      , myMsgs   = messages.filter(m => m.author.id === Discord.client.user.id)

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
                reply: true,
                handler: async (params, author, channel, server) => {
                    if (!params[0] || !Number(params[0])) return 'You need to give me a number of messages to prune!'

                    let missingPerms = Tools.checkOwnPermissions(server, ['readMessageHistory', 'manageMessages'])
                    if (missingPerms) return fancyPrintPerms(missingPerms)

                    let toPrune = Number(params[0])
                    if (toPrune > 100) return 'The maximum I can prune at a time is 100 messages. Please lower the number and try again.'

                    let silent = params[1] === 'silent' // silent, remove command & PM user after prune
                      , messages = await Discord.client.getChannelLogs(channel, toPrune+1) // +1 as including the command invoked
                      , promises = []

                    if (!silent) messages.shift() // disregard command normally
                    for (let m of messages) promises.push(Tools.reflect(Discord.client.deleteMessage(m)))
                    return Promise.all(promises)
                                  .then(res => {
                                      let reply = `Pruned the last ${res.filter(x => x.status === 'resolved').length} messages(s)`
                                      if (!silent) return `${reply}.`
                                      Discord.sendMessage(author, `${reply} silently. [${server.name} :: #${channel.name}]`)
                                      return null
                                  })
                }
            },
            'prefix': {
                description: 'Sets the prefix used for the bot on this server. You can use the the prefix \'$mention$\' to indicate a mention of me.',
                permissionLevel: 2,
                blockPM: true,
                noPermissionsResponse: 'You require to be a server admin to set the prefix used by MeowBot on this server.',
                reply: true,
                handler: async (params, author, channel, server) => {
                    if (!params[0]) return
                    let prefix = params.join(' ')
                    await Database.Servers.update({ server: server.id }, { $set: { prefix } }, { upsert: true })
                    return `Prefix for this server has been updated to: \`${prefix}\`.`
                }
            },
            'ignore': {
                description: 'Makes the bot ignore commands in a text channel in a server. Ignores all but the \'unignore\' command to unignore the channel. Leave the parameter blank to ignore the current channel.',
                permissionLevel: 1,
                blockPM: true,
                noPermissionsResponse: 'You require to at least be a server mod to ignore a text channel.',
                reply: true,
                handler: async (params, author, channel, server) => {
                    let ignoreChannel = channel
                    if (params[0]) ignoreChannel = Tools.resolveMention(params.join(' '))
                    if (!ignoreChannel) return 'Invalid channel to be ignored. Please ensure you are mentioning the channel in question.'

                    let alreadyIgnored = ((await Database.Servers.findOne({ server: server.id })) || {}).ignoreChannels || []
                    if (alreadyIgnored.indexOf(ignoreChannel.id) > -1) return 'The channel is already being ignored by MeowBot.'

                    await Database.Servers.update({ server: server.id }, { $push: { ignoreChannels: ignoreChannel.id } }, { upsert: true })
                    return 'The channel is now being ignored. *(you can still use the `unignore` command here to unignore it.)*'
                }
            },
            'unignore': {
                description: 'Unignores a channel that is being ignored. Leave the parameter blank to unignore the current channel.',
                permissionLevel: 1,
                blockPM: true,
                noPermissionsResponse: 'You require to at least be a server mod to unignore a text channel.',
                reply: true,
                allowIgnored: true,
                handler: async (params, author, channel, server) => {
                    let ignoreChannel = channel
                    if (params[0]) ignoreChannel = Tools.resolveMention(params.join(' '))
                    if (!ignoreChannel) return 'Invalid channel to be unignored. Please ensure you are mentioning the channel in question.'

                    let ignored = ((await Database.Servers.findOne({ server: server.id })) || {}).ignoreChannels || []
                      , index   = ignored.indexOf(ignoreChannel.id)
                    if (index < 0) return 'The channel is currently not being ignored by MeowBot.'

                    ignored.splice(index, 1)
                    await Database.Servers.update({ server: server.id }, { ignoreChannels: ignored }, { upsert: true })
                    return 'The channel is now being monitored again by MeowBot.'
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
