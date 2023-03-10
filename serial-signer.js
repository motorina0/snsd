
class SerialSigner {
    selectedPort = null
    writableStreamClosed = null
    readableStreamClosed = null
    writer = null

    constructor() {

    }
    async openSerialPort(config = { baudRate: 9600 }) {
        try {
            this.selectedPort = await navigator.serial.requestPort()
            this.selectedPort.addEventListener('connect', event => {
                console.lgo('### connected')
            })

            this.selectedPort.addEventListener('disconnect', () => {
                this.selectedPort = null
                console.lgo('### disconnected')
            })

            // Wait for the serial port to open.
            await this.selectedPort.open(config)
            // do not await
            this.startSerialPortReading()
            // wait to init
            sleep(1000)

            const textEncoder = new TextEncoderStream()
            this.writableStreamClosed = textEncoder.readable.pipeTo(
                this.selectedPort.writable
            )

            this.writer = textEncoder.writable.getWriter()

            await this.pingDevice()

            return true
        } catch (error) {
            console.warn(error)
            this.selectedPort = null
            return false
        }
    }

    async startSerialPortReading() {
        const port = this.selectedPort

        while (port && port.readable) {
            const textDecoder = new TextDecoderStream()
            this.readableStreamClosed = port.readable.pipeTo(textDecoder.writable)
            this.reader = textDecoder.readable.getReader()
            const readStringUntil = readFromSerialPort(this.reader)

            try {
                while (true) {
                    const { value, done } = await readStringUntil('\n')
                    if (value) {
                        const { command, commandData } = await this.extractCommand(value)
                        console.log('### command, commandData', command, commandData)
                        this.handleSerialPortResponse(command, commandData)
                        // this.updateSerialPortConsole(command) // here
                    }
                    if (done) return
                }
            } catch (error) {
                console.warn(error)
            }
        }
    }

    async sendCommandClearText(command, attrs = []) {
        const message = [command].concat(attrs).join(' ')
        await this.writer.write(message + '\n')
    }
    async extractCommand(value) {
        const command = value.split(' ')[0]
        const commandData = value.substring(command.length).trim()

        return { command, commandData }
    }

    async pingDevice() {
        try {
            // Send an empty ping. The serial port buffer might have some jubk data. Flush it.
            await this.sendCommandClearText(COMMAND_PING)
            await this.sendCommandClearText(COMMAND_PING, [window.location.host])
        } catch (error) {
            console.warn(error)
        }
    }

    async signMessage(messageHex) {
        try {
            await this.sendCommandClearText(COMMAND_SIGN_MESSAGE, [messageHex])
        } catch (error) {
            console.warn(error)
        }
    }

    async getPublicKey() {
        try {
            await this.sendCommandClearText(COMMAND_PUBLIC_KEY, [])
        } catch (error) {
            console.warn(error)
        }
    }

    async getSharedSecret(pubkeyHex) {
        try {
            await this.sendCommandClearText(COMMAND_SHARED_SECRET, [pubkeyHex])
        } catch (error) {
            console.warn(error)
        }
    }

    async handleSerialPortResponse(command, commandData) {

        switch (command) {
            case COMMAND_PING:
                this.handlePingResponse(commandData)
                break

            case COMMAND_PUBLIC_KEY:
                this.handlePublicKeyResponse(commandData)
                break

            case COMMAND_SIGN_MESSAGE:
                this.handleSignResponse(commandData)
                break

            case COMMAND_SHARED_SECRET:
                this.handleSharedSecretResponse(commandData)
                break

            case COMMAND_LOG:
                console.log(
                    `   %c${commandData}`,
                    'background: #222; color: #bada55'
                )
                break
            default:
                console.log(`   %c${command}`, 'background: #222; color: red')
        }
    }


    handlePingResponse(data) {
        console.log("### ping", data)
    }

    handleSignResponse(data) {
        document.getElementById("signature").innerText = data
    }

    handleSharedSecretResponse(data) {
        document.getElementById("shared-secret").innerText = data
    }

    handlePublicKeyResponse(data) {
        document.getElementById("my-public-key").innerText = data
    }
}

