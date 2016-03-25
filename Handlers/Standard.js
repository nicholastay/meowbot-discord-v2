class Standard {
    get commands() {
        return {
            '~meowbot': {
                description: 'Basic info about bot command.',
                handler: () => {
                    return 'meow meow meow! i\'m nexerq\'s little cat helper! nya!'
                }
            }
        }
    }
}

export default new Standard
