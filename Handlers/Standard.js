import Discord from '../Core/Discord'

let Standard = [
    {
        description: 'Basic info about bot command.',
        handler: (message, author, channel, data) => {
            if (message === '~meowbot') {
                Discord.client.sendMessage(channel, 'meow meow meow! i\'m nexerq\'s little cat helper! nya!')
            }
        }
    }
]

export default Standard
