import Database from '../Core/Database'
import Handlers from '../Core/Handlers'
import Discord from '../Core/Discord'

class Commands {
    constructor() {
        this.globals = {}
        this.loadGlobals()
    }

    async loadGlobals() {
        this.globals = (await Database.Commands.find({ server: '$g' })) || {}
    }

    get commands() {
        return {
            'servercommands': {
                description: 'Lists all the server commands available for the current server.',
                blockPM: true,
                handler: async (params, author, channel, server) => {
                    let serverId = server.id
                    if (params[0] === '$g')
                        serverId = '$g'

                    let commands = await Database.Commands.find({ server: serverId })

                    if (commands.length < 0)
                        return 'There are no commands available on this server...'

                    return `The commands available for this server are: ${commands.map(c => `\`${c.command}\``).join(', ')}`
                }
            },
            'createcommand': {
                description: 'Creates a custom command for a server that gives a custom text response.',
                permissionLevel: 1,
                blockPM: true,
                noPermissionsResponse: 'You require to be at least a server mod to create a custom MeowBot command.',
                reply: true,
                requireParams: true,
                handler: async (params, author, channel, server, message) => {
                    let command  = params.shift()
                      , response = params.join(' ')
                      , serverId = server.id

                    if (!response) return 'You need to provide a response for this command!'

                    if (command.startsWith('$g:')) {
                        if (message.meowPerms < 3)
                            return 'You do not have permissions to create a global MeowBot command.'
                        serverId = '$g'
                        command = command.substr(3)
                    }

                    let existing = await Database.Commands.findOne({ command, server: serverId })
                    if (existing) return 'This command already exists. If you wish to edit it please use the \'editcommand\' command.'

                    return Database.Commands.insert({ command, response, server: serverId })
                                            .then(() => { return `The command '${command}' was sucessfully added.` })
                }
            },
            'editcommand': {
                description: 'Edits an existing command in a server.',
                permissionLevel: 1,
                blockPM: true,
                noPermissionsResponse: 'You require to be at least a server mod to edit a custom MeowBot command.',
                reply: true,
                requireParams: true,
                handler: async (params, author, channel, server) => {
                    let command  = params.shift()
                      , serverId = server.id

                    if (command.startsWith('$g:')) {
                        if (message.meowPerms < 3)
                            return 'You do not have permissions to create a global MeowBot command.'
                        serverId = '$g'
                        command = command.substr(3)
                    }

                    let existing = await Database.Commands.findOne({ command, server: serverId })

                    return Database.Commands.update(existing, { $set: { response: params.join(' ') } })
                                            .then(() => { return `The command '${command}' was sucessfully edited.` })
                }
            },
            'removecommand': {
                description: 'Removes a custom command from the server.',
                permissionLevel: 1,
                blockPM: true,
                noPermissionsResponse: 'You require to be at least a server mod to remove custom MeowBot commands.',
                reply: true,
                requireParams: true,
                handler: async (params, author, channel, server) => {
                    let command  = params.shift()
                      , serverId = server.id

                    if (command.startsWith('$g:')) {
                        if (message.meowPerms < 3)
                            return 'You do not have permissions to create a global MeowBot command.'
                        serverId = '$g'
                        command = command.substr(3)
                    }

                    let removeCommand = await Database.Commands.findOne({ command, server: serverId })
                    if (!removeCommand) return 'This command does not exist, I cannot remove a command that doesn\'t exist, baka!'

                    return Database.Commands.remove(removeCommand)
                                            .then(() => { return 'The command was successfully removed.' })
                }
            }
        }
    }

    get handlers() {
        return [
            {
                description: 'Command checker and responder',
                handler: async (message, author, channel, server) => {
                    let command = message.split(' ').shift()

                    if (Handlers.commands[command])
                        return // yeah lets just ignore this

                    // globals can take priority
                    if (this.globals[command])
                        return Discord.sendMessage(channel, this.globals[command])

                    let dbResp = await Database.Commands.findOne({ command, server: server.id })
                    if (!dbResp) return

                    Discord.sendMessage(channel, dbResp.response)
                }
            }
        ]
    }
}

export default new Commands
