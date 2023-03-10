const COMMAND_PING = '/ping';
const COMMAND_SIGN_MESSAGE = '/sign-message';
const COMMAND_SHARED_SECRET = '/shared-secret';
const COMMAND_PUBLIC_KEY = '/public-key';
const COMMAND_LOG = '/log';

const sleep = ms => new Promise(r => setTimeout(r, ms))

const readFromSerialPort = reader => {
    let partialChunk
    let fulliness = []

    const readStringUntil = async (separator = '\n') => {
        if (fulliness.length) return fulliness.shift().trim()
        const chunks = []
        if (partialChunk) {
            // leftovers from previous read
            chunks.push(partialChunk)
            partialChunk = undefined
        }
        while (true) {
            const { value, done } = await reader.read()
            if (value) {
                const values = value.split(separator)
                // found one or more separators
                if (values.length > 1) {
                    chunks.push(values.shift()) // first element
                    partialChunk = values.pop() // last element
                    fulliness = values // full lines
                    return { value: chunks.join('').trim(), done: false }
                }
                chunks.push(value)
            }
            if (done) return { value: chunks.join('').trim(), done: true }
        }
    }
    return readStringUntil
}