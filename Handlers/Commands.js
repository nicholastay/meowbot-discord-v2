import { db as Database } from '../Core/Database'
import Discord from '../Core/Discord'

class Commands {
    get commands() {
        return {
            'createcommand': {
                description: 'Creates a custom command for a server that gives a custom text response.',
                permissionLevel: 1,
                pm: false,
                noPermissionsResponse: 'You require to be at least a server mod to create a custom MeowBot command.',
                reply: true,
                handler: async (params, author, channel) => {
                    let command  = params.shift()
                      , response = params.join(' ')

                    let existing = await Database.Commands.findOne({ command, server: channel.server.id })
                    if (existing) return 'This command already exists. If you wish to edit it please remove it then recreate it to confirm such an action.'

                    return Database.Commands.insert({ command, response, server: channel.server.id })
                                            .then(() => { return `The command '${command}' was sucessfully added.` })
                }
            },
            'removecommand': {
                description: 'Removes a custom command from the server.',
                permissionLevel: 1,
                pm: false,
                noPermissionsResponse: 'You require to be at least a server mod to remove custom MeowBot commands.',
                reply: true,
                handler: async (params, author, channel) => {
                    let command = params.shift()

                    let removeCommand = await Database.Commands.findOne({ command, server: channel.server.id })
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
                handler: async (message, author, channel) => {
                    let command = message.split(' ').shift()

                    let dbResp = await Database.Commands.findOne({ command, server: channel.server.id })
                    if (!dbResp) return

                    Discord.sendMessage(channel, dbResp.response)
                }
            }
        ]
    }
}

export default new Commands
