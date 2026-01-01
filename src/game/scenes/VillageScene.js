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

        // Create player character using pixel art 8-direction idle sprite
        this.player = this.add.sprite(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'pixel_idle_8dir',
            0  // Start at frame 0 (south direction)
        )
        this.player.setOrigin(0.5, 1) // Anchor at bottom-center (feet position)
        this.player.setScale(3.0) // Scale up pixel art 3x for visibility (64px -> 192px)

        // ===== 8-DIRECTION PIXEL ART IDLE ANIMATIONS =====
        // Spritesheet layout: 4 columns (frames) × 8 rows (directions)
        // Row order: 0=south, 1=south-west, 2=west, 3=north-west, 4=north, 5=north-east, 6=east, 7=south-east
        const directions = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east']
        const framesPerRow = 4

        directions.forEach((dir, rowIndex) => {
            const animKey = `pixel_idle_${dir}`
            if (!this.anims.exists(animKey)) {
                // Calculate frame indices for this row
                const startFrame = rowIndex * framesPerRow
                const endFrame = startFrame + framesPerRow - 1

                this.anims.create({
                    key: animKey,
                    frames: this.anims.generateFrameNumbers('pixel_idle_8dir', { start: startFrame, end: endFrame }),
                    frameRate: 6,
                    repeat: -1
                })
            }
        })

        // Keep legacy animations for walk/run (until we have pixel art versions)
        // ===== WALK Animation (using char_walk_se, 28 frames) =====
        if (!this.anims.exists('walk_se')) {
            this.anims.create({
                key: 'walk_se',
                frames: this.anims.generateFrameNumbers('char_walk_se', { start: 0, end: 27 }),
                frameRate: 14,
                repeat: -1
            })
        }

        // ===== RUN Animation (faster walk) =====
        if (!this.anims.exists('run_se')) {
            this.anims.create({
                key: 'run_se',
                frames: this.anims.generateFrameNumbers('char_walk_se', { start: 0, end: 27 }),
                frameRate: 20,
                repeat: -1
            })
        }

        // Start with south-facing idle animation
        this.player.anims.play('pixel_idle_south', true)
        this.currentDirection = 'south'

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

        // Check if running (shift key held)
        const isRunning = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT).isDown
        const currentSpeed = isRunning ? this.playerSpeed * 1.8 : this.playerSpeed

        // Keyboard movement
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            velocityX = -currentSpeed
            this.player.setFlipX(true)
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            velocityX = currentSpeed
            this.player.setFlipX(false)
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            velocityY = -currentSpeed
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            velocityY = currentSpeed
        }

        // Click to move
        if (this.targetX !== undefined && velocityX === 0 && velocityY === 0) {
            const dx = this.targetX - this.player.x
            const dy = this.targetY - this.player.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance > 10) {
                velocityX = (dx / distance) * currentSpeed
                velocityY = (dy / distance) * currentSpeed

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

        // Handle animation based on movement state
        const isMoving = velocityX !== 0 || velocityY !== 0

        if (isMoving) {
            // Calculate 8-way direction from velocity
            const angle = Math.atan2(velocityY, velocityX) * (180 / Math.PI)

            // Map angle to 8 directions (angle 0 = east, increases clockwise)
            // east: -22.5 to 22.5, south-east: 22.5 to 67.5, etc.
            let direction
            let flipX = false

            if (angle >= -22.5 && angle < 22.5) {
                direction = 'east'
            } else if (angle >= 22.5 && angle < 67.5) {
                direction = 'south-east'
            } else if (angle >= 67.5 && angle < 112.5) {
                direction = 'south'
            } else if (angle >= 112.5 && angle < 157.5) {
                direction = 'south-west'
                // Use south-east animation flipped
                direction = 'south-east'
                flipX = true
            } else if (angle >= 157.5 || angle < -157.5) {
                direction = 'west'
                // Use east animation flipped
                direction = 'east'
                flipX = true
            } else if (angle >= -157.5 && angle < -112.5) {
                direction = 'north-west'
                // Use north-east animation flipped
                direction = 'north-east'
                flipX = true
            } else if (angle >= -112.5 && angle < -67.5) {
                direction = 'north'
            } else if (angle >= -67.5 && angle < -22.5) {
                direction = 'north-east'
            }

            this.player.setFlipX(flipX)
            this.currentDirection = direction

            // For now, use idle animation while moving (until we have walk sprites)
            // TODO: Replace with pixel_walk_ animations when available
            const targetAnim = `pixel_idle_${direction}`

            if (this.player.anims.currentAnim?.key !== targetAnim) {
                this.player.anims.play(targetAnim, true)
            }
        } else {
            // Play idle animation for the last direction faced
            const idleDir = this.currentDirection || 'south'
            const targetAnim = `pixel_idle_${idleDir}`

            if (this.player.anims.currentAnim?.key !== targetAnim) {
                this.player.anims.play(targetAnim, true)
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
