import Database from '../Core/Database'
import Discord from '../Core/Discord'

class Commands {
    get commands() {
        return {
            'servercommands': {
                description: 'Lists all the server commands available for the current server.',
                blockPM: true,
                handler: async (params, author, channel, server) => {
                    let commands = await Database.Commands.find({ server: server.id })

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
                handler: async (params, author, channel, server) => {
                    let command  = params.shift()
                      , response = params.join(' ')

                    if (!response) return 'You need to provide a response for this command!'

                    let existing = await Database.Commands.findOne({ command, server: server.id })
                    if (existing) return 'This command already exists. If you wish to edit it please use the \'editcommand\' command.'

                    return Database.Commands.insert({ command, response, server: server.id })
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

                    let existing = await Database.Commands.findOne({ command, server: server.id })

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
                    let command = params.shift()

                    let removeCommand = await Database.Commands.findOne({ command, server: server.id })
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

                    let dbResp = await Database.Commands.findOne({ command, server: server.id })
                    if (!dbResp) return

                    Discord.sendMessage(channel, dbResp.response)
                }
            }
        ]
    }
}

export default new Commands
