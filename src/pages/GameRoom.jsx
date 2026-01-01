import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getFirstName } from '../lib/names'
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
import ScoreTable from '../components/ScoreTable'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import { getPlayerAvatar } from '../lib/avatar'
import 'swiper/css'
import 'swiper/css/pagination'

// Test player IDs from migration
const TEST_PLAYERS = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Player A' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Player B' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Player C' }
]

const GameRoom = ({ roomCode, onLeave, onNavigate }) => {
    const { player } = useAuth()
    const [room, setRoom] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showHuModal, setShowHuModal] = useState(false)
    const swiperRef = useRef(null)

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
            // Navigate to Game Log slide
            swiperRef.current?.slideTo(1)
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
            <div className="h-[100svh] flex items-center justify-center bg-orange">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-[100svh] flex flex-col items-center justify-center bg-orange gap-4">
                <p className="font-body font-bold text-lg">Error: {error}</p>
                <button
                    className="bg-white border-comic-thin py-2 px-6 rounded-md font-bold cursor-pointer shadow-comic-sm"
                    onClick={onLeave}
                >
                    Back
                </button>
            </div>
        )
    }

    const isHost = room.host_id === player?.id
    const allRoomPlayers = room.room_players || []
    const players = allRoomPlayers.filter(rp => !rp.is_spectator)
    const spectators = allRoomPlayers.filter(rp => rp.is_spectator)
    const sortedPlayers = [...players].sort((a, b) => a.seat_position - b.seat_position)
    const hasEmptySeats = players.length < 4
    const isSpectator = spectators.some(s => s.player_id === player?.id)

    return (
        <div className="h-[100svh] bg-orange flex flex-col overflow-hidden">
            {/* Room Header */}
            <header className="bg-yellow border-b-[3px] border-black p-3 flex justify-between items-center shrink-0">
                <button
                    className="bg-white border-comic-thin py-1.5 px-3 rounded-md font-bold text-sm cursor-pointer shadow-comic-sm hover:bg-gray-100"
                    onClick={handleLeaveRoom}
                >
                    ← Leave
                </button>
                <div className="text-center">
                    <span className="block text-xs font-bold uppercase text-gray-500">牌局</span>
                    <span className="block font-title text-xl">{room.room_code}</span>
                </div>
                <div className={`text-xs font-bold py-1 px-2 rounded-sm border-2 border-black ${room.status === 'waiting' ? 'bg-yellow' : room.status === 'active' ? 'bg-green' : 'bg-gray-200'
                    }`}>
                    {room.status === 'waiting' && '⏳ Waiting'}
                    {room.status === 'active' && '🎮 對戰中'}
                    {room.status === 'completed' && '✅ Finished'}
                </div>
            </header>

            {/* Admin: Add test players button */}
            {isAdmin && room.status === 'waiting' && hasEmptySeats && (
                <div className="p-2 bg-pink border-b-2 border-black shrink-0">
                    <button
                        className="w-full bg-white border-comic-thin py-2 rounded-md font-bold text-sm cursor-pointer shadow-comic-sm"
                        onClick={handleAddTestPlayers}
                    >
                        🧪 加測試玩家
                    </button>
                </div>
            )}

            {/* Swiper Slider */}
            <Swiper
                modules={[Pagination]}
                pagination={{ clickable: true }}
                onSwiper={(swiper) => { swiperRef.current = swiper }}
                className="flex-1 w-full pb-8 [&_.swiper-pagination]:bottom-0 [&_.swiper-pagination-bullet]:w-3 [&_.swiper-pagination-bullet]:h-3 [&_.swiper-pagination-bullet]:bg-white [&_.swiper-pagination-bullet]:border-2 [&_.swiper-pagination-bullet]:border-black [&_.swiper-pagination-bullet]:opacity-100 [&_.swiper-pagination-bullet]:mx-1.5 [&_.swiper-pagination-bullet-active]:!bg-cyan [&_.swiper-pagination-bullet-active]:scale-125"
                spaceBetween={0}
                slidesPerView={1}
            >
                {/* Slide 1: Players */}
                <SwiperSlide>
                    <section className="h-full p-4 pb-8 grid grid-cols-2 grid-rows-2 gap-3">
                        {[1, 2, 3, 4].map(seat => {
                            const playerInSeat = sortedPlayers.find(p => p.seat_position === seat)
                            return (
                                <div
                                    key={seat}
                                    className={`rounded-xl border-comic-medium p-3 flex flex-col items-center justify-center text-center transition-all duration-200 ${playerInSeat
                                        ? 'bg-white shadow-comic-md'
                                        : 'bg-gray-200/50 border-dashed'
                                        }`}
                                >
                                    {playerInSeat ? (
                                        <>
                                            <div className="relative mb-2">
                                                <img
                                                    src={getPlayerAvatar(playerInSeat.player, 112)}
                                                    alt=""
                                                    className="w-14 h-14 rounded-full border-comic-medium shadow-comic-sm object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                                {playerInSeat.player_id === room.host_id && (
                                                    <span className="absolute -top-1 -right-1 text-lg">👑</span>
                                                )}
                                            </div>
                                            <div className="font-bold text-sm truncate w-full">
                                                {getFirstName(playerInSeat.player?.display_name) || 'Player'}
                                            </div>
                                            <div className={`font-title text-xl ${playerInSeat.current_points >= 0 ? 'text-green' : 'text-red'
                                                }`}>
                                                {playerInSeat.current_points >= 0 ? '+' : ''}{playerInSeat.current_points}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-gray-500">
                                            <div className="font-bold text-sm">Seat {seat}</div>
                                            <div className="text-xs">Waiting...</div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </section>
                </SwiperSlide>

                {/* Slide 2: Score Table */}
                <SwiperSlide>
                    <section className="h-full flex flex-col p-4 pb-8">
                        {/* <h3 className="font-title text-xl mb-3 shrink-0">SCORE TABLE</h3> */}
                        <div className="flex-1 min-h-0 bg-white border-comic-thin rounded-lg shadow-comic-sm overflow-hidden">
                            <ScoreTable
                                roomId={room.id}
                                players={players}
                                onUpdate={handleHuSuccess}
                            />
                        </div>
                    </section>
                </SwiperSlide>

                {/* Slide 3: Game Log (History) */}
                <SwiperSlide>
                    <section className="h-full flex flex-col p-4 pb-8">
                        <h3 className="font-title text-xl mb-3 shrink-0">GAME LOG</h3>
                        <div className="flex-1 overflow-hidden">
                            <GameLog
                                roomId={room.id}
                                players={players}
                                onUpdate={handleHuSuccess}
                            />
                        </div>
                    </section>
                </SwiperSlide>
            </Swiper>

            {/* Game Controls */}
            <section className="p-4 border-t-[3px] border-black bg-yellow shrink-0">
                {room.status === 'waiting' && isHost && players.length >= 2 && (
                    <button
                        className="w-full bg-green border-comic-medium py-3 rounded-lg font-title text-xl cursor-pointer shadow-comic-md transition-all duration-150 hover:-translate-y-0.5 hover:shadow-comic-lg active:translate-y-0.5 active:shadow-comic-sm"
                        onClick={handleStartGame}
                    >
                        🎮 開始
                    </button>
                )}

                {room.status === 'waiting' && players.length < 2 && (
                    <p className="text-center font-bold">
                        Waiting for more players... ({players.length}/4)
                    </p>
                )}

                {room.status === 'active' && !isSpectator && (
                    <div className="flex gap-3">
                        <button
                            className="flex-1 bg-cyan border-comic-medium py-3 rounded-lg font-title text-lg cursor-pointer shadow-comic-md transition-all duration-150 hover:-translate-y-0.5 hover:shadow-comic-lg active:translate-y-0.5 active:shadow-comic-sm"
                            onClick={() => setShowHuModal(true)}
                        >
                            記錄食糊
                        </button>
                        {isHost && (
                            <button
                                className="bg-red text-white border-comic-medium py-3 px-4 rounded-lg font-title text-lg cursor-pointer shadow-comic-md transition-all duration-150 hover:-translate-y-0.5 hover:shadow-comic-lg active:translate-y-0.5 active:shadow-comic-sm"
                                onClick={handleEndGame}
                            >
                                🏁 End
                            </button>
                        )}
                    </div>
                )}

                {room.status === 'active' && isSpectator && (
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-cyan/30 border-2 border-cyan px-4 py-2 rounded-full">
                            <span>👁</span>
                            <span className="font-bold">觀戰中</span>
                            <span className="text-sm text-gray-600">({spectators.length} 個觀眾)</span>
                        </div>
                    </div>
                )}

                {room.status === 'completed' && (
                    <div className="text-center">
                        <h3 className="font-title text-2xl mb-3">Game Over!</h3>
                        <button
                            className="bg-white border-comic-medium py-2 px-6 rounded-lg font-bold cursor-pointer shadow-comic-md"
                            onClick={onLeave}
                        >
                            Back to Dashboard
                        </button>
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
                onNavigate={onNavigate}
            />
        </div>
    )
}

export default GameRoom
