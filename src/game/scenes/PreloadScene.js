import Phaser from 'phaser'

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' })
    }

    preload() {
        // Show loading progress
        const width = this.cameras.main.width
        const height = this.cameras.main.height

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontFamily: 'Bangers, cursive',
            fontSize: '32px',
            fill: '#ffffff'
        })
        loadingText.setOrigin(0.5, 0.5)

        // Progress bar background
        const progressBox = this.add.graphics()
        progressBox.fillStyle(0x222222, 0.8)
        progressBox.fillRect(width / 2 - 160, height / 2 - 10, 320, 30)

        // Progress bar fill
        const progressBar = this.add.graphics()

        this.load.on('progress', (value) => {
            progressBar.clear()
            progressBar.fillStyle(0x00d4ff, 1)
            progressBar.fillRect(width / 2 - 155, height / 2 - 5, 310 * value, 20)
        })

        this.load.on('complete', () => {
            progressBar.destroy()
            progressBox.destroy()
            loadingText.destroy()
        })

        // Load assets
        this.load.image('village', '/game/maps/village.png')

        // Load character sheet as regular image (we'll crop manually)
        this.load.image('character_sheet', '/game/sprites/characters.png')
    }

    create() {
        // Create texture frames from the character sheet
        // The image is 1024x512 with characters arranged irregularly
        // Row 1: 6 characters, Row 2: 5 characters
        const sheet = this.textures.get('character_sheet')
        const source = sheet.getSourceImage()

        // Approximate character positions (x, y, width, height)
        // These are estimates based on the 11-character layout
        const characterFrames = [
            // Row 1 (6 characters)
            { x: 0, y: 0, w: 100, h: 260 },      // 0: Orange girl
            { x: 100, y: 0, w: 90, h: 260 },     // 1: Yellow warrior
            { x: 195, y: 0, w: 100, h: 260 },    // 2: Red hunter
            { x: 345, y: 0, w: 100, h: 260 },    // 3: Blue punk (selected)
            { x: 520, y: 0, w: 135, h: 260 },    // 4: Beast rider
            { x: 680, y: 0, w: 160, h: 260 },    // 5: Big chief
            // Row 2 (5 characters)
            { x: 0, y: 260, w: 80, h: 250 },     // 6: Baby
            { x: 160, y: 260, w: 100, h: 250 },  // 7: Green mage
            { x: 340, y: 260, w: 100, h: 250 },  // 8: Gray elder
            { x: 510, y: 260, w: 120, h: 250 },  // 9: Yellow twins
            { x: 720, y: 260, w: 120, h: 250 },  // 10: Red girl
            { x: 870, y: 260, w: 100, h: 250 },  // 11: Blonde girl
        ]

        // Create individual textures for each character
        characterFrames.forEach((frame, index) => {
            // Create a canvas to crop the character
            const canvas = document.createElement('canvas')
            canvas.width = frame.w
            canvas.height = frame.h
            const ctx = canvas.getContext('2d')
            ctx.drawImage(source, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h)

            // Add as a new texture
            this.textures.addImage(`char_${index}`, canvas)
        })

        this.scene.start('VillageScene')
    }
}

