import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
    getRoomByCode,
    startGame,
    endGame,
    leaveRoom,
    subscribeToRoom,
    unsubscribeFromRoom
} from '../lib/rooms'
import HuModal from '../components/HuModal'
import GameLog from '../components/GameLog'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

// Test player IDs from migration
const TEST_PLAYERS = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Player A' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Player B' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Player C' }
]

const GameRoom = ({ roomCode, onLeave }) => {
    const { player } = useAuth()
    const [room, setRoom] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showHuModal, setShowHuModal] = useState(false)
    const [activeTab, setActiveTab] = useState('players') // 'players' or 'log'

    const isAdmin = player?.is_admin === true

    // Fetch room data and subscribe to changes
    useEffect(() => {
        let channel = null

        const fetchRoom = async () => {
            try {
                const roomData = await getRoomByCode(roomCode)
                setRoom(roomData)
                setLoading(false)

                // Subscribe to real-time updates
                channel = subscribeToRoom(roomData.id, async () => {
                    const updatedRoom = await getRoomByCode(roomCode)
                    setRoom(updatedRoom)
                })
            } catch (err) {
                setError(err.message)
                setLoading(false)
            }
        }

        fetchRoom()

        return () => {
            if (channel) {
                unsubscribeFromRoom(channel)
            }
        }
    }, [roomCode])

    const handleStartGame = async () => {
        console.log('Starting game...', { roomId: room.id, playerId: player?.id, hostId: room.host_id })
        try {
            await startGame(room.id, player.id)
            console.log('Game started successfully')
            // Force refresh room data to update UI immediately
            const updatedRoom = await getRoomByCode(roomCode)
            setRoom(updatedRoom)
        } catch (err) {
            console.error('Start game error:', err)
            setError(err.message)
        }
    }

    const handleEndGame = async () => {
        console.log('Ending game...')
        try {
            await endGame(room.id)
            console.log('Game ended successfully')
            // Force refresh room data
            const updatedRoom = await getRoomByCode(roomCode)
            setRoom(updatedRoom)
        } catch (err) {
            console.error('End game error:', err)
            setError(err.message)
        }
    }

    const handleLeaveRoom = async () => {
        try {
            await leaveRoom(room.id, player.id)
            onLeave()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleHuSuccess = async () => {
        // Refresh room data to get updated points
        const updatedRoom = await getRoomByCode(roomCode)
        setRoom(updatedRoom)
    }

    // Admin: Add test players to fill the table
    const handleAddTestPlayers = async () => {
        if (!isAdmin) return

        const currentPlayerIds = room.room_players.map(p => p.player_id)
        const emptySeats = [1, 2, 3, 4].filter(
            seat => !room.room_players.find(p => p.seat_position === seat)
        )

        for (let i = 0; i < Math.min(emptySeats.length, TEST_PLAYERS.length); i++) {
            const testPlayer = TEST_PLAYERS[i]
            if (currentPlayerIds.includes(testPlayer.id)) continue

            await supabase
                .from('room_players')
                .insert({
                    room_id: room.id,
                    player_id: testPlayer.id,
                    seat_position: emptySeats[i],
                    current_points: 0
                })
        }

        // Refresh room
        const updatedRoom = await getRoomByCode(roomCode)
        setRoom(updatedRoom)
    }

    if (loading) {
        return (
            <div className="game-room loading">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="game-room error">
                <p>Error: {error}</p>
                <button onClick={onLeave}>Back</button>
            </div>
        )
    }

    const isHost = room.host_id === player?.id
    const players = room.room_players || []
    const sortedPlayers = [...players].sort((a, b) => a.seat_position - b.seat_position)
    const hasEmptySeats = players.length < 4

    return (
        <div className="game-room">
            {/* Room Header */}
            <header className="room-header">
                <button className="game-room-back-btn" onClick={handleLeaveRoom}>
                    ← Leave
                </button>
                <div className="room-code-display">
                    <span className="label">Table Code</span>
                    <span className="code">{room.room_code}</span>
                </div>
                <div className="room-status">
                    {room.status === 'waiting' && '⏳ Waiting'}
                    {room.status === 'active' && '🎮 Playing'}
                    {room.status === 'completed' && '✅ Finished'}
                </div>
            </header>

            {/* Admin: Add test players button */}
            {isAdmin && room.status === 'waiting' && hasEmptySeats && (
                <div className="admin-controls">
                    <button className="add-test-players-btn" onClick={handleAddTestPlayers}>
                        🧪 Add Test Players
                    </button>
                </div>
            )}

            {/* Swiper Slider */}
            <Swiper
                modules={[Pagination]}
                pagination={{ clickable: true }}
                className="game-swiper"
                spaceBetween={0}
                slidesPerView={1}
            >
                {/* Slide 1: Players */}
                <SwiperSlide>
                    <section className="players-grid">
                        {[1, 2, 3, 4].map(seat => {
                            const playerInSeat = sortedPlayers.find(p => p.seat_position === seat)
                            return (
                                <div
                                    key={seat}
                                    className={`player-seat ${playerInSeat ? 'occupied' : 'empty'}`}
                                >
                                    {playerInSeat ? (
                                        <>
                                            <div className="player-avatar">
                                                {playerInSeat.player?.avatar_url ? (
                                                    <img src={playerInSeat.player.avatar_url} alt="" />
                                                ) : (
                                                    <div className="avatar-placeholder">
                                                        {playerInSeat.player?.display_name?.[0] || '?'}
                                                    </div>
                                                )}
                                                {playerInSeat.player_id === room.host_id && (
                                                    <span className="host-badge">👑</span>
                                                )}
                                            </div>
                                            <div className="player-name">
                                                {playerInSeat.player?.display_name || 'Player'}
                                            </div>
                                            <div className={`player-points ${playerInSeat.current_points >= 0 ? 'positive' : 'negative'}`}>
                                                {playerInSeat.current_points >= 0 ? '+' : ''}{playerInSeat.current_points}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="empty-seat">
                                            <div className="seat-number">Seat {seat}</div>
                                            <div className="waiting-text">Waiting...</div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </section>
                </SwiperSlide>

                {/* Slide 2: Game Log */}
                <SwiperSlide>
                    <section className="game-log-container">
                        <h3 className="log-title">GAME LOG</h3>
                        <GameLog
                            roomId={room.id}
                            players={players}
                            onUpdate={handleHuSuccess}
                        />
                    </section>
                </SwiperSlide>
            </Swiper>

            {/* Game Controls */}
            <section className="game-controls">
                {room.status === 'waiting' && isHost && players.length >= 2 && (
                    <button className="start-btn" onClick={handleStartGame}>
                        🎮 Start Game
                    </button>
                )}

                {room.status === 'waiting' && players.length < 2 && (
                    <p className="waiting-message">
                        Waiting for more players... ({players.length}/4)
                    </p>
                )}

                {room.status === 'active' && (
                    <>
                        <button className="hu-btn" onClick={() => setShowHuModal(true)}>
                            🀄 Record Win (Hu)
                        </button>
                        {isHost && (
                            <button className="end-btn" onClick={handleEndGame}>
                                🏁 End Game
                            </button>
                        )}
                    </>
                )}

                {room.status === 'completed' && (
                    <div className="game-over">
                        <h3>Game Over!</h3>
                        <button onClick={onLeave}>Back to Dashboard</button>
                    </div>
                )}
            </section>

            {/* Hu Modal */}
            <HuModal
                isOpen={showHuModal}
                onClose={() => setShowHuModal(false)}
                roomId={room.id}
                players={players}
                onSuccess={handleHuSuccess}
            />
        </div>
    )
}

export default GameRoom
