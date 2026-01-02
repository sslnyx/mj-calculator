import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { GameRoomProvider, useGameRoom } from '../contexts/GameRoomContext'
import { supabase } from '../lib/supabase'
import { getFirstName } from '../lib/names'
import {
    getRoomByCode,
    startGame,
    endGame,
    leaveRoom
} from '../lib/rooms'
import HuModal from '../components/HuModal'
import GameLog from '../components/GameLog'
import ScoreTable from '../components/ScoreTable'
import GuestSelectModal from '../components/GuestSelectModal'
import ConfirmModal from '../components/ConfirmModal'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import { getPlayerAvatar } from '../lib/avatar'
import { UserPlus } from 'lucide-react'
import { TEST_PLAYERS } from '../lib/constants'
import 'swiper/css'
import 'swiper/css/pagination'

// Inner component that uses the context
const GameRoomContent = ({ roomCode, onLeave, onNavigate }) => {
    const { player } = useAuth()
    const {
        room,
        rounds,
        players,
        spectators,
        scoreTotals,
        loading,
        error,
        refreshData,
        setRoom,
        setError
    } = useGameRoom()

    const [showHuModal, setShowHuModal] = useState(false)
    const [showGuestModal, setShowGuestModal] = useState(false)
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
    const [selectedSeat, setSelectedSeat] = useState(null)
    const swiperRef = useRef(null)

    const isAdmin = player?.is_admin === true

    const handleStartGame = async () => {
        console.log('Starting game...', { roomId: room.id, playerId: player?.id, hostId: room.host_id })
        try {
            await startGame(room.id, player.id)
            console.log('Game started successfully')
            await refreshData()
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
            await refreshData()
        } catch (err) {
            console.error('End game error:', err)
            setError(err.message)
        }
    }

    const handleLeaveRoom = async () => {
        const realPlayers = room.room_players.filter(rp => !rp.is_spectator && !rp.player?.is_guest)
        const isLastRealPlayer = realPlayers.length === 1 && realPlayers[0].player_id === player.id

        if (isLastRealPlayer && room.status === 'active') {
            setShowLeaveConfirm(true)
            return
        }

        await confirmLeaveRoom()
    }

    const confirmLeaveRoom = async () => {
        setShowLeaveConfirm(false)
        try {
            await leaveRoom(room.id, player.id)
            onLeave()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleHuSuccess = async () => {
        await refreshData()
    }

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

        await refreshData()
    }

    const handleAddGuest = (seat) => {
        setSelectedSeat(seat)
        setShowGuestModal(true)
    }

    const handleGuestSelected = async (guest) => {
        try {
            await supabase
                .from('room_players')
                .insert({
                    room_id: room.id,
                    player_id: guest.id,
                    seat_position: selectedSeat,
                    current_points: 0
                })

            await refreshData()
        } catch (err) {
            setError(err.message)
        }
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
                className="flex-1 w-full pb-8 [&_.swiper-pagination]:bottom-0 [&_.swiper-pagination-bullet]:w-3 [&_.swiper-pagination-bullet]:h-3 [&_.swiper-pagination-bullet]:bg-white [&_.swiper-pagination-bullet]:border-2 [&_.swiper-pagination-bullet]:border-black [&_.swiper-pagination-bullet]:opacity-100 [&_.swiper-pagination-bullet]:mx-3 [&_.swiper-pagination-bullet-active]:!bg-cyan [&_.swiper-pagination-bullet-active]:scale-125"
                spaceBetween={0}
                slidesPerView={1}
            >
                {/* Slide 1: Players */}
                <SwiperSlide>
                    <section className="h-full p-4 pb-12 grid grid-cols-2 grid-rows-2 gap-3">
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
                                            <div className={`font-title text-xl ${(scoreTotals[seat] || 0) >= 0 ? 'text-green' : 'text-red'
                                                }`}>
                                                {(scoreTotals[seat] || 0) >= 0 ? '+' : ''}{scoreTotals[seat] || 0}
                                            </div>
                                        </>
                                    ) : room.status === 'waiting' ? (
                                        <button
                                            onClick={() => handleAddGuest(seat)}
                                            className="flex flex-col items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                                        >
                                            <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center hover:border-gray-500 hover:bg-gray-100 transition-all">
                                                <UserPlus size={24} className="text-gray-400" />
                                            </div>
                                            <div className="font-bold text-sm">加玩家</div>
                                        </button>
                                    ) : (
                                        <div className="text-gray-500">
                                            <div className="font-bold text-sm">Seat {seat}</div>
                                            <div className="text-xs">Empty</div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </section>
                </SwiperSlide>

                {/* Slide 2: Score Table */}
                <SwiperSlide>
                    <section className="h-full flex flex-col p-4 pb-12">
                        <div className="flex-1 min-h-0 bg-white border-comic-thin rounded-lg shadow-comic-sm overflow-hidden">
                            <ScoreTable onUpdate={handleHuSuccess} />
                        </div>
                    </section>
                </SwiperSlide>

                {/* Slide 3: Game Log (History) */}
                <SwiperSlide>
                    <section className="h-full flex flex-col p-4 pb-12">
                        <h3 className="font-title text-xl mb-3 shrink-0">GAME LOG</h3>
                        <div className="flex-1 overflow-hidden">
                            <GameLog onUpdate={handleHuSuccess} />
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

            {/* Guest Select Modal */}
            <GuestSelectModal
                isOpen={showGuestModal}
                onClose={() => setShowGuestModal(false)}
                ownerId={player?.id}
                onSelect={handleGuestSelected}
                roomId={room.id}
            />

            {/* Leave Confirmation Modal */}
            <ConfirmModal
                isOpen={showLeaveConfirm}
                title="確定離開?"
                message="你係最後一個玩家。離開後牌局會自動結束，所有分數會被記錄。"
                onConfirm={confirmLeaveRoom}
                onCancel={() => setShowLeaveConfirm(false)}
            />
        </div>
    )
}

// Wrapper component that provides the context
const GameRoom = ({ roomCode, onLeave, onNavigate }) => {
    return (
        <GameRoomProvider roomCode={roomCode}>
            <GameRoomContent roomCode={roomCode} onLeave={onLeave} onNavigate={onNavigate} />
        </GameRoomProvider>
    )
}

export default GameRoom
