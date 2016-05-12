import Database from '../Core/Database'
import Handlers from '../Core/Handlers'
import Discord from '../Core/Discord'

class Commands {
    constructor() {
        this.globals = {}
        this.reloadGlobals()
    }

    async reloadGlobals() {
        let commands = await Database.Commands.find({ server: '$g' })
        if (commands.length === 0)
            return this.globals = {}

        for (let command of commands) {
            if (!command.command || !command.response)
                continue // invalid
            
            this.globals[command.command] = command.response
        }
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

                    if (commands.length < 1)
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

                    if (!response)
                        return 'You need to provide a response for this command!'

                    if (command.startsWith('$g:')) {
                        if (message.meowPerms < 3)
                            return 'You do not have permissions to create a global MeowBot command.'
                        serverId = '$g'
                        command = command.substr(3)
                    }

                    let existing = await Database.Commands.findOne({ command, server: serverId })
                    if (existing)
                        return 'This command already exists. If you wish to edit it please use the \'editcommand\' command.'

                    if (command.length === '1')
                        return 'This command is too short, please consider making it longer.'

                    return Database.Commands.insert({ command, response, server: serverId })
                                            .then(() => {
                                                if (serverId === '$g')
                                                    this.reloadGlobals()
                                                return `The command '${command}' was sucessfully added.`
                                            })
                }
            },
            'editcommand': {
                description: 'Edits an existing command in a server.',
                permissionLevel: 1,
                blockPM: true,
                noPermissionsResponse: 'You require to be at least a server mod to edit a custom MeowBot command.',
                reply: true,
                requireParams: true,
                handler: async (params, author, channel, server, message) => {
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
                                            .then(() => {
                                                if (serverId === '$g')
                                                    this.reloadGlobals()
                                                return `The command '${command}' was sucessfully edited.`
                                            })
                }
            },
            'removecommand': {
                description: 'Removes a custom command from the server.',
                permissionLevel: 1,
                blockPM: true,
                noPermissionsResponse: 'You require to be at least a server mod to remove custom MeowBot commands.',
                reply: true,
                requireParams: true,
                handler: async (params, author, channel, server, message) => {
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
                                            .then(() => {
                                                if (serverId === '$g')
                                                    this.reloadGlobals()
                                                return 'The command was successfully removed.'
                                            })
                }
            }
        }
    }

    get handlers() {
        return [
            {
                description: 'Command checker and responder',
                handler: async (message, author, channel, server) => {
                    let i       = message.indexOf(' ')
                      , command = i < 0 ? message : message.substr(0, i)
                      , input   = i < 0 ? '' : message.substr(i+1, i.length)

                    if (Handlers.commands[command])
                        return // yeah lets just ignore this

                    // globals can take priority
                    if (this.globals[command])
                        return Discord.sendMessage(channel, this.globals[command])

                    let dbResp = await Database.Commands.findOne({ command, server: server.id })
                    if (!dbResp)
                        return

                    let response = dbResp.response
                    // if input dont allow blank
                    if ((response.indexOf('${input}') > -1) && !input)
                        return
                    // replaces for params etc
                    response = response
                                    .replace(/\${username}/g, author.name)
                                    .replace(/\${input}/g, input)

                    Discord.sendMessage(channel, response)
                }
            }
        ]
    }
}

export default new Commands
