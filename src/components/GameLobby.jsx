import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import PreloadScene from '../game/scenes/PreloadScene'
import VillageScene from '../game/scenes/VillageScene'
import EventBus from '../game/EventBus'

// Character names matching the sprite sheet
const CHARACTERS = [
    { id: 0, name: 'Orange Girl', tribe: 'fire' },
    { id: 1, name: 'Yellow Warrior', tribe: 'earth' },
    { id: 2, name: 'Red Hunter', tribe: 'fire' },
    { id: 3, name: 'Blue Punk', tribe: 'water' },
    { id: 4, name: 'Beast Rider', tribe: 'earth' },
    { id: 5, name: 'Big Chief', tribe: 'fire' },
    { id: 6, name: 'Baby', tribe: 'wind' },
    { id: 7, name: 'Green Mage', tribe: 'earth' },
    { id: 8, name: 'Gray Elder', tribe: 'wind' },
    { id: 9, name: 'Yellow Twin A', tribe: 'fire' },
    { id: 10, name: 'Red Twin', tribe: 'fire' },
    { id: 11, name: 'Yellow Twin B', tribe: 'earth' }
]

const GameLobby = ({ player, onBack }) => {
    const gameRef = useRef(null)
    const containerRef = useRef(null)
    const [selectedChar, setSelectedChar] = useState(0)
    const [showCharSelect, setShowCharSelect] = useState(false)
    const [sceneReady, setSceneReady] = useState(false)

    useEffect(() => {
        if (gameRef.current) return // Prevent double init

        const config = {
            type: Phaser.AUTO,
            parent: containerRef.current,
            width: 375, // Mobile-first width
            height: 600,
            backgroundColor: '#1a1a2e',
            scene: [PreloadScene, VillageScene],
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            render: {
                pixelArt: false,
                antialias: true
            }
        }

        gameRef.current = new Phaser.Game(config)

        // Listen for scene ready
        const handleSceneReady = () => {
            setSceneReady(true)
        }
        EventBus.on('scene-ready', handleSceneReady)

        return () => {
            EventBus.off('scene-ready', handleSceneReady)
            EventBus.removeAllListeners()
            if (gameRef.current) {
                gameRef.current.destroy(true)
                gameRef.current = null
            }
        }
    }, [])

    const handleCharacterSelect = (charId) => {
        setSelectedChar(charId)
        EventBus.emit('change-character', charId)
        setShowCharSelect(false)
    }

    return (
        <div className="h-full w-full bg-gray-900 flex flex-col">
            {/* Game Canvas */}
            <div
                ref={containerRef}
                className="flex-1 relative"
                style={{ minHeight: 0 }}
            />

            {/* Bottom Controls */}
            <div className="shrink-0 bg-gray-800 border-t-2 border-black p-3 flex justify-between items-center">
                <button
                    onClick={onBack}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg font-bold border-2 border-black"
                >
                    ← Back
                </button>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCharSelect(true)}
                        className="bg-cyan text-black px-4 py-2 rounded-lg font-bold border-2 border-black"
                    >
                        🧑 Character
                    </button>
                </div>
            </div>

            {/* Character Selection Modal */}
            {showCharSelect && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl border-4 border-black p-4 max-w-[350px] w-full max-h-[80%] overflow-y-auto">
                        <h3 className="text-white font-title text-xl mb-4 text-center">
                            Select Character
                        </h3>

                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {CHARACTERS.map((char) => (
                                <button
                                    key={char.id}
                                    onClick={() => handleCharacterSelect(char.id)}
                                    className={`aspect-square rounded-lg border-2 p-1 transition-all ${selectedChar === char.id
                                            ? 'border-cyan bg-cyan/20 scale-105'
                                            : 'border-gray-600 bg-gray-700 hover:border-white'
                                        }`}
                                >
                                    <div className="text-2xl text-center">
                                        {['🔥', '💧', '🌿', '💨'][['fire', 'water', 'earth', 'wind'].indexOf(char.tribe)]}
                                    </div>
                                    <div className="text-[10px] text-white text-center truncate">
                                        {char.name}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowCharSelect(false)}
                            className="w-full bg-gray-600 text-white py-2 rounded-lg font-bold border-2 border-black"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default GameLobby
