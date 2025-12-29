import { useState } from 'react'
import GameLobby from '../components/GameLobby'

// Test page to preview the Stone Age game lobby
const GameTestPage = () => {
    const [showLobby, setShowLobby] = useState(true)

    // Mock player for testing
    const mockPlayer = {
        id: 'test-player-123',
        display_name: 'Test Player',
        character_type: 0
    }

    if (!showLobby) {
        return (
            <div className="h-[100svh] bg-gray-900 flex items-center justify-center">
                <button
                    onClick={() => setShowLobby(true)}
                    className="bg-cyan text-black px-8 py-4 rounded-xl font-bold text-xl border-4 border-black"
                >
                    🎮 Enter Stone Age Lobby
                </button>
            </div>
        )
    }

    return (
        <div className="h-[100svh]">
            <GameLobby
                player={mockPlayer}
                onBack={() => setShowLobby(false)}
            />
        </div>
    )
}

export default GameTestPage
