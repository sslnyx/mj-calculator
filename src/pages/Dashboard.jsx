import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { createRoom, joinRoom as joinTableService } from '../lib/rooms'
import GameRoom from './GameRoom'
import ProfilePage from './ProfilePage'
import RankingsPage from './RankingsPage'
import ConfirmModal from '../components/ConfirmModal'
import BottomNav from '../components/BottomNav'
import { getPlayerAvatar } from '../lib/avatar'

// Helper to get first name only
const getFirstName = (fullName) => {
    if (!fullName) return ''
    return fullName.split(' ')[0]
}

const Dashboard = () => {
    const { player, signOut, loading } = useAuth()
    const [stats, setStats] = useState(null)
    const [activeTables, setActiveTables] = useState([])
    const [currentTable, setCurrentTable] = useState(null)
    const [currentPage, setCurrentPage] = useState('home') // 'home', 'profile', 'rankings'
    const [error, setError] = useState(null)
    const [isCreating, setIsCreating] = useState(false)
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

    // Fetch and subscribe to active tables
    useEffect(() => {
        const fetchTables = async () => {
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
        }

        fetchTables()

        // Subscribe to table changes
        const channel = supabase
            .channel('public:game_rooms')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'game_rooms' },
                () => fetchTables()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'room_players' },
                () => fetchTables()
            )
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [])

    const handleCreateTable = async () => {
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
    }

    const handleJoinTable = async (tableCode) => {
        setError(null)
        try {
            await joinTableService(tableCode, player.id)
            setCurrentTable(tableCode)
        } catch (err) {
            setError(err.message)
        }
    }

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
            // First remove all players
            await supabase
                .from('room_players')
                .delete()
                .eq('room_id', tableId)

            // Then delete/close the table
            await supabase
                .from('game_rooms')
                .update({ status: 'completed', ended_at: new Date().toISOString() })
                .eq('id', tableId)
        } catch (err) {
            setError(err.message)
        } finally {
            deletingRef.current = false
        }
    }

    const handleLeaveTable = () => {
        setCurrentTable(null)
        setError(null)
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
        return <GameRoom roomCode={currentTable} onLeave={handleLeaveTable} />
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
                    Sign Out
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
                        {isCreating ? 'Creating...' : '🀄 Create New Table'}
                    </button>
                </section>

                {/* Active Tables - Scrollable Section */}
                <section className="flex-1 flex flex-col">
                    <div className="px-6">

                        <h3 className="font-title text-xl mb-4 flex items-center gap-2 shrink-0">
                            <span className="flex items-center justify-center w-7 h-7 bg-black text-white rounded-sm text-sm shadow-[2px_2px_0_#888888]">#</span>
                            Active Tables
                        </h3>
                    </div>

                    {activeTables.length === 0 ? (
                        <div className="text-center p-8 bg-white border-comic-thin rounded-lg border-dashed mx-6">
                            <p className="m-0 font-bold">No active tables</p>
                            <p className="text-gray-500 text-sm mt-2">Create a new table to start playing!</p>
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
                                                {table.status === 'waiting' ? '⏳ Waiting' : '🎮 Playing'}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                className="bg-orange border-comic-thin py-2 px-4 rounded-md font-bold text-sm cursor-pointer shadow-comic-sm uppercase hover:bg-[#FFB74D] disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={() => handleJoinTable(table.room_code)}
                                                disabled={
                                                    // Disable only if full AND not already a member
                                                    table.room_players?.length >= 4 &&
                                                    !table.room_players?.some(rp => rp.player_id === player?.id)
                                                }
                                            >
                                                {table.room_players?.some(rp => rp.player_id === player?.id)
                                                    ? 'Rejoin'
                                                    : 'Join'}
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    className="bg-white border-comic-thin p-2 rounded-md cursor-pointer shadow-comic-sm transition-all duration-150 hover:bg-red"
                                                    onClick={() => handleDeleteClick(table.id)}
                                                    title="Delete table"
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

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteConfirm !== null}
                title="Delete Table"
                message="Are you sure you want to delete this table? All players will be removed."
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteConfirm(null)}
            />

            {/* Fixed Bottom Navigation */}
            <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
        </div>
    )
}

export default Dashboard
