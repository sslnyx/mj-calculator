import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { createRoom, joinRoom as joinTableService, joinAsSpectator, endGame } from '../lib/rooms'
import GameRoom from './GameRoom'
import ProfilePage from './ProfilePage'
import RankingsPage from './RankingsPage'
import HistoryPage from './HistoryPage'
import PatternsPage from './PatternsPage'
import ConfirmModal from '../components/ConfirmModal'
import BottomNav from '../components/BottomNav'
import { getPlayerAvatar } from '../lib/avatar'
import { getFirstName } from '../lib/names'

const Dashboard = () => {
    const { player, signOut, loading } = useAuth()
    const [stats, setStats] = useState(null)
    const [activeTables, setActiveTables] = useState([])
    const [currentTable, setCurrentTable] = useState(null)
    const [currentPage, setCurrentPage] = useState('home') // 'home', 'profile', 'rankings'
    const [error, setError] = useState(null)
    const [isCreating, setIsCreating] = useState(false)
    const [archiveConfirm, setArchiveConfirm] = useState(null) // tableId to archive
    const [deleteConfirm, setDeleteConfirm] = useState(null) // tableId to delete

    const isAdmin = player?.is_admin === true
    const deletingRef = useRef(false)

    // Fetch player stats (on load and when returning from game)
    useEffect(() => {
        const fetchStats = async () => {
            if (!player) return

            const { data } = await supabase
                .from('player_stats')
                .select('*')
                .eq('player_id', player.id)
                .single()

            if (data) setStats(data)
        }

        // Only fetch when not at a table (i.e., on dashboard)
        if (!currentTable) {
            fetchStats()
        }
    }, [player, currentTable])

    const fetchTables = useCallback(async () => {
        const { data } = await supabase
            .from('game_rooms')
            .select(`
          *,
          room_players (
            *,
            player:players (id, display_name, avatar_url, avatar_seed)
          )
        `)
            .in('status', ['waiting', 'active'])
            .order('created_at', { ascending: false })
            .limit(10)

        if (data) setActiveTables(data)
    }, [])

    const refreshTimerRef = useRef(null)
    const debouncedRefresh = useCallback(() => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = setTimeout(() => {
            console.log('[Dashboard] Executing debounced table refresh...')
            fetchTables()
        }, 500)
    }, [fetchTables])

    // Fetch and subscribe to active tables
    useEffect(() => {
        console.log('[Dashboard] Initializing table subscription...')
        fetchTables()

        // Subscribe to table changes
        const channel = supabase
            .channel('public:game_rooms')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'game_rooms' },
                () => {
                    console.log('[Dashboard] Room event received')
                    debouncedRefresh()
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'room_players' },
                () => {
                    console.log('[Dashboard] Player event received')
                    debouncedRefresh()
                }
            )
            .subscribe((status) => {
                console.log(`[Dashboard] Realtime status: ${status}`)
            })

        // Refresh when page becomes visible (handles mobile lock screen wake)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[Dashboard] Page visible, refreshing lobby...')
                fetchTables()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            console.log('[Dashboard] Cleaning up table subscription...')
            supabase.removeChannel(channel)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
        }
    }, [fetchTables, debouncedRefresh])

    const handleCreateTable = useCallback(async () => {
        setError(null)
        setIsCreating(true)
        try {
            const table = await createRoom(player.id)
            setCurrentTable(table.room_code)
        } catch (err) {
            setError(err.message)
        } finally {
            setIsCreating(false)
        }
    }, [player?.id])

    const handleJoinTable = useCallback(async (tableCode) => {
        setError(null)
        try {
            await joinTableService(tableCode, player.id)
            setCurrentTable(tableCode)
        } catch (err) {
            setError(err.message)
        }
    }, [player?.id])

    const handleArchiveClick = (tableId) => {
        if (!isAdmin) return
        setArchiveConfirm(tableId)
    }

    const handleArchiveConfirm = async () => {
        if (!archiveConfirm || deletingRef.current) return

        deletingRef.current = true
        const tableId = archiveConfirm
        setArchiveConfirm(null)

        try {
            // Use the shared endGame function from rooms.js
            await endGame(tableId)

            // Then remove all players
            await supabase
                .from('room_players')
                .delete()
                .eq('room_id', tableId)
        } catch (err) {
            setError(err.message)
        } finally {
            deletingRef.current = false
        }
    }

    const handleLeaveTable = useCallback(() => {
        setCurrentTable(null)
        setError(null)
    }, [])

    const handleDeleteClick = (tableId) => {
        if (!isAdmin) return
        setDeleteConfirm(tableId)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm || deletingRef.current) return

        deletingRef.current = true
        const tableId = deleteConfirm
        setDeleteConfirm(null)

        try {
            // Delete all game rounds for this room
            await supabase
                .from('game_rounds')
                .delete()
                .eq('room_id', tableId)

            // Delete all vacated seats for this room
            await supabase
                .from('vacated_seats')
                .delete()
                .eq('room_id', tableId)

            // Delete all room players
            await supabase
                .from('room_players')
                .delete()
                .eq('room_id', tableId)

            // Delete the game room itself
            await supabase
                .from('game_rooms')
                .delete()
                .eq('id', tableId)
        } catch (err) {
            setError(err.message)
        } finally {
            deletingRef.current = false
        }
    }

    if (loading) {
        return (
            <div className="h-[100svh] flex items-center justify-center bg-gray-100">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    // If at a table, show the table view
    if (currentTable) {
        return <GameRoom roomCode={currentTable} onLeave={handleLeaveTable} onNavigate={setCurrentPage} />
    }

    // Profile Page
    if (currentPage === 'profile') {
        return (
            <>
                <ProfilePage playerId={player?.id} onBack={() => setCurrentPage('home')} />
                <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
            </>
        )
    }

    // Rankings Page
    if (currentPage === 'rankings') {
        return (
            <>
                <RankingsPage onBack={() => setCurrentPage('home')} />
                <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
            </>
        )
    }

    // History Page
    if (currentPage === 'history') {
        return (
            <>
                <HistoryPage onBack={() => setCurrentPage('home')} />
                <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
            </>
        )
    }

    // Patterns Page
    if (currentPage === 'patterns') {
        return (
            <>
                <PatternsPage onBack={() => setCurrentPage('home')} />
                <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
            </>
        )
    }

    return (
        <div className="h-[100svh] bg-gray-100 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-yellow border-b-[3px] border-black p-6 pt-8 flex justify-between items-start gap-4 shrink-0">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <img
                        src={getPlayerAvatar(player, 120)}
                        alt={player?.display_name}
                        className="w-[60px] h-[60px] rounded-full border-comic-medium shadow-comic-sm shrink-0"
                        referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                        <h2 className="font-title text-xl m-0 flex items-center gap-2 flex-wrap">
                            {getFirstName(player?.display_name)}
                        </h2>
                    </div>
                </div>
                <button
                    className="bg-white border-comic-thin py-2 px-4 rounded-md font-bold text-xs cursor-pointer shadow-comic-sm uppercase shrink-0 hover:bg-gray-100"
                    onClick={signOut}
                >
                    登出
                </button>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="bg-red text-white p-3 flex justify-between items-center border-b-2 border-black">
                    <span className="font-bold">{error}</span>
                    <button
                        className="bg-transparent border-none text-white text-xl cursor-pointer"
                        onClick={() => setError(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Main Content - Scrollable */}
            <main className="flex-1 pt-8 flex flex-col overflow-hidden pb-20">
                {/* Create Table Button */}
                <section className="mb-8 shrink-0 px-6">
                    <button
                        className="w-full p-6 bg-cyan border-comic-medium rounded-lg font-title text-2xl font-bold cursor-pointer shadow-comic-lg uppercase transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:-rotate-1 hover:shadow-[8px_8px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_#000000] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                        onClick={handleCreateTable}
                        disabled={isCreating}
                    >
                        {isCreating ? '開緊...' : '開新枱'}
                    </button>
                </section>

                {/* 進行中嘅枱 - Scrollable Section */}
                <section className="flex-1 flex flex-col">
                    <div className="px-6">

                        <h3 className="font-title text-xl mb-4 flex items-center gap-2 shrink-0">
                            <span className="flex items-center justify-center w-7 h-7 bg-black text-white rounded-sm text-sm shadow-[2px_2px_0_#888888]">#</span>
                            進行中嘅枱
                        </h3>
                    </div>

                    {activeTables.length === 0 ? (
                        <div className="text-center p-8 bg-white border-comic-thin rounded-lg border-dashed mx-6">
                            <p className="m-0 font-bold">暫時冇枱</p>
                            <p className="text-gray-500 text-sm mt-2">開新枱開始打牌!</p>
                        </div>
                    ) : (
                        <div className="flex-1 scroll-section px-6 py-2">
                            <div className="flex flex-col gap-4">
                                {activeTables.map((table, index) => (
                                    <div
                                        key={table.id}
                                        className={`bg-white border-comic-medium rounded-lg p-4 shadow-comic-md flex justify-between items-center transition-all duration-150 hover:rotate-0 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-comic-lg ${index % 2 === 0 ? '-rotate-[0.5deg]' : 'rotate-[0.5deg]'
                                            }`}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="font-title text-2xl font-bold">{table.room_code}</div>
                                            <div className="flex items-center gap-1">
                                                {table.room_players?.map((rp, i) => (
                                                    <img
                                                        key={i}
                                                        src={getPlayerAvatar(rp.player, 48)}
                                                        alt=""
                                                        className="w-6 h-6 rounded-full border-2 border-black -ml-1.5 first:ml-0"
                                                        title={rp.player?.display_name}
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ))}
                                                <span className="text-xs font-bold text-gray-500 ml-1">
                                                    {table.room_players?.length || 0}/4
                                                </span>
                                            </div>
                                            <div className={`text-xs font-bold py-0.5 px-2 rounded-sm border-2 border-black w-fit ${table.status === 'waiting' ? 'bg-yellow' : 'bg-green'
                                                }`}>
                                                {table.status === 'waiting' ? '⏳ 等緊人' : '🎮 對戰中'}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {/* Join/Rejoin button - only if not full or already member */}
                                            {(() => {
                                                const isMember = table.room_players?.some(rp => rp.player_id === player?.id)
                                                const nonSpectators = table.room_players?.filter(rp => !rp.is_spectator) || []
                                                const isFull = nonSpectators.length >= 4

                                                if (isMember) {
                                                    return (
                                                        <button
                                                            className="bg-orange border-comic-thin py-2 px-4 rounded-md font-bold text-sm cursor-pointer shadow-comic-sm uppercase hover:bg-[#FFB74D]"
                                                            onClick={() => handleJoinTable(table.room_code)}
                                                        >
                                                            Rejoin
                                                        </button>
                                                    )
                                                }

                                                if (!isFull) {
                                                    return (
                                                        <button
                                                            className="bg-orange border-comic-thin py-2 px-4 rounded-md font-bold text-sm cursor-pointer shadow-comic-sm uppercase hover:bg-[#FFB74D]"
                                                            onClick={() => handleJoinTable(table.room_code)}
                                                        >
                                                            Join
                                                        </button>
                                                    )
                                                }

                                                // Full and not a member - show 觀戰 button
                                                return (
                                                    <button
                                                        className="bg-cyan border-comic-thin py-2 px-4 rounded-md font-bold text-sm cursor-pointer shadow-comic-sm uppercase hover:bg-[#4DD0E1]"
                                                        onClick={async () => {
                                                            try {
                                                                await joinAsSpectator(table.room_code, player.id)
                                                                setCurrentTable(table.room_code)
                                                            } catch (err) {
                                                                setError(err.message)
                                                            }
                                                        }}
                                                    >
                                                        👁 觀戰
                                                    </button>
                                                )
                                            })()}
                                            {isAdmin && (
                                                <button
                                                    className="bg-white border-comic-thin p-2 rounded-md cursor-pointer shadow-comic-sm transition-all duration-150 hover:bg-orange"
                                                    onClick={() => handleArchiveClick(table.id)}
                                                    title="結束牌局"
                                                >
                                                    📦
                                                </button>
                                            )}
                                            {isAdmin && (
                                                <button
                                                    className="bg-white border-comic-thin p-2 rounded-md cursor-pointer shadow-comic-sm transition-all duration-150 hover:bg-red hover:text-white"
                                                    onClick={() => handleDeleteClick(table.id)}
                                                    title="刪除牌局"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </main>

            {/* Archive Confirmation Modal */}
            <ConfirmModal
                isOpen={archiveConfirm !== null}
                title="結束牌局"
                message="結束呢個牌局? 最終成績會被保存。"
                onConfirm={handleArchiveConfirm}
                onCancel={() => setArchiveConfirm(null)}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteConfirm !== null}
                title="刪除牌局"
                message="⚠️ 完全刪除呢個牌局? 所有數據將被永久刪除，無法恢復!"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteConfirm(null)}
            />

            {/* Fixed Bottom Navigation */}
            <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
        </div>
    )
}

export default Dashboard
