import Phaser from 'phaser'
import EventBus from '../EventBus'

export default class VillageScene extends Phaser.Scene {
    constructor() {
        super({ key: 'VillageScene' })
        this.player = null
        this.cursors = null
        this.otherPlayers = {}
        this.playerSpeed = 160
        this.currentCharacter = 3 // Default to blue punk (index 3)
    }

    create() {
        // Add village background - scale to fit game size
        const bg = this.add.image(0, 0, 'village')
        bg.setOrigin(0, 0)

        // Scale background to cover game area
        const scaleX = this.cameras.main.width / bg.width
        const scaleY = this.cameras.main.height / bg.height
        const scale = Math.max(scaleX, scaleY)
        bg.setScale(scale)

        // Create player character using idle sprite sheet initially
        this.player = this.add.sprite(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'test_sheet_idle'
        )
        this.player.setScale(0.3) // Scale down

        // Define Idle Animation (3 frames)
        if (!this.anims.exists('idle')) {
            this.anims.create({
                key: 'idle',
                frames: this.anims.generateFrameNumbers('test_sheet_idle', { start: 0, end: 2 }),
                frameRate: 4, // Slower for idle
                repeat: -1,
                yoyo: true // Ping-pong effect for smoother breathing
            })
        }

        // Define Walk Animation (6 frames)
        if (!this.anims.exists('walk')) {
            this.anims.create({
                key: 'walk',
                frames: this.anims.generateFrameNumbers('test_sheet_walk', { start: 0, end: 5 }),
                frameRate: 10,
                repeat: -1
            })
        }

        // Start idle
        this.player.anims.play('idle')

        // Make player interactive
        this.player.setInteractive()

        // Enable keyboard input
        this.cursors = this.input.keyboard.createCursorKeys()

        // WASD keys
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        }

        // Click to move
        this.input.on('pointerdown', (pointer) => {
            this.targetX = pointer.x
            this.targetY = pointer.y
        })

        // Add some UI text
        this.add.text(16, 16, 'Stone Age Village', {
            fontFamily: 'Bangers, cursive',
            fontSize: '24px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        })

        this.add.text(16, 48, 'Use WASD or Arrow keys to move', {
            fontFamily: 'sans-serif',
            fontSize: '14px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        })

        // Emit ready event to React
        EventBus.emit('scene-ready', this)

        // Listen for character change from React
        EventBus.on('change-character', (charIndex) => {
            if (this.player && this.textures.exists(`char_${charIndex}`)) {
                this.currentCharacter = charIndex
                this.player.setTexture(`char_${charIndex}`)
            }
        })

        // Listen for other players update
        EventBus.on('update-players', (players) => {
            this.updateOtherPlayers(players)
        })
    }

    update() {
        if (!this.player) return

        let velocityX = 0
        let velocityY = 0

        // Keyboard movement
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            velocityX = -this.playerSpeed
            this.player.setFlipX(true)
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            velocityX = this.playerSpeed
            this.player.setFlipX(false)
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            velocityY = -this.playerSpeed
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            velocityY = this.playerSpeed
        }

        // Click to move
        if (this.targetX !== undefined && velocityX === 0 && velocityY === 0) {
            const dx = this.targetX - this.player.x
            const dy = this.targetY - this.player.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance > 10) {
                velocityX = (dx / distance) * this.playerSpeed
                velocityY = (dy / distance) * this.playerSpeed

                if (dx < 0) this.player.setFlipX(true)
                else if (dx > 0) this.player.setFlipX(false)
            } else {
                this.targetX = undefined
                this.targetY = undefined
            }
        }

        // Apply movement
        const deltaTime = this.game.loop.delta / 1000
        this.player.x += velocityX * deltaTime
        this.player.y += velocityY * deltaTime

        // Handle walking animation
        const isMoving = velocityX !== 0 || velocityY !== 0

        if (isMoving) {
            // Play walk animation if shorter duration or if different
            if (this.player.anims.currentAnim?.key !== 'walk') {
                this.player.anims.play('walk', true)
            }
        } else {
            // Play idle animation
            if (this.player.anims.currentAnim?.key !== 'idle') {
                this.player.anims.play('idle', true)
            }
        }

        // Keep player in bounds
        this.player.x = Phaser.Math.Clamp(this.player.x, 50, this.cameras.main.width - 50)
        this.player.y = Phaser.Math.Clamp(this.player.y, 50, this.cameras.main.height - 50)

        // Emit position to React (for multiplayer sync)
        EventBus.emit('player-moved', {
            x: this.player.x,
            y: this.player.y
        })
    }

    updateOtherPlayers(players) {
        // Remove players that left
        Object.keys(this.otherPlayers).forEach(id => {
            if (!players.find(p => p.id === id)) {
                this.otherPlayers[id].destroy()
                delete this.otherPlayers[id]
            }
        })

        // Add/update players
        players.forEach(player => {
            if (this.otherPlayers[player.id]) {
                // Update existing player position
                this.otherPlayers[player.id].x = player.x
                this.otherPlayers[player.id].y = player.y
                const charKey = `char_${player.characterFrame || 0}`
                if (this.textures.exists(charKey)) {
                    this.otherPlayers[player.id].setTexture(charKey)
                }
            } else {
                // Create new player image
                const charKey = `char_${player.characterFrame || 0}`
                const texture = this.textures.exists(charKey) ? charKey : 'char_0'
                const sprite = this.add.image(
                    player.x || 200,
                    player.y || 200,
                    texture
                )
                sprite.setScale(0.4)
                sprite.setAlpha(0.9)
                this.otherPlayers[player.id] = sprite
            }
        })
    }

    destroy() {
        EventBus.off('change-character')
        EventBus.off('update-players')
    }
}
