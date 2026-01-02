import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import HexagonChart from '../components/HexagonChart'
import AvatarPicker from '../components/AvatarPicker'
import { ArrowLeft, Pencil, Check, X, Camera } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getPlayerAvatar } from '../lib/avatar'
import { calculateHexagonData, getNetPoints, hasEnoughGames } from '../lib/stats'
import { getPatternName } from '../lib/patterns'

const ProfilePage = ({ playerId, onBack }) => {
    const { player: currentPlayer, updatePlayer } = useAuth()
    const [player, setPlayer] = useState(null)
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    // Name editing state
    const [isEditingName, setIsEditingName] = useState(false)
    const [newName, setNewName] = useState('')
    const [nameError, setNameError] = useState('')
    const [savingName, setSavingName] = useState(false)

    // Avatar picker state
    const [showAvatarPicker, setShowAvatarPicker] = useState(false)
    const [savingAvatar, setSavingAvatar] = useState(false)

    const fetchProfile = useCallback(async (showRefresh = false) => {
        if (!playerId) return
        if (showRefresh) setRefreshing(true)
        else setLoading(true)

        // Fetch player info
        const { data: playerData } = await supabase
            .from('players')
            .select('*')
            .eq('id', playerId)
            .single()

        // Fetch player stats
        const { data: statsData } = await supabase
            .from('player_stats')
            .select('*')
            .eq('player_id', playerId)
            .maybeSingle()

        setPlayer(playerData)
        setStats(statsData)
        setLoading(false)
        setRefreshing(false)
    }, [playerId])

    useEffect(() => {
        fetchProfile()

        // Subscribe to real-time stats updates
        const subscription = supabase
            .channel(`player_stats_${playerId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'player_stats',
                filter: `player_id=eq.${playerId}`
            }, () => {
                fetchProfile(true)
            })
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [playerId, fetchProfile])

    // Check if the user can change their name (no longer limited)
    const canChangeName = () => {
        return true // Removed 7-day limitation
    }

    // Get days until next name change (no longer needed)
    const getDaysUntilNextChange = () => {
        return 0 // No limitation
    }


    // Handle name save
    const handleSaveName = async () => {
        const trimmedName = newName.trim()
        if (!trimmedName) {
            setNameError('名稱不能為空')
            return
        }
        if (trimmedName.length < 2) {
            setNameError('名稱至少需要2個字符')
            return
        }
        if (trimmedName.length > 20) {
            setNameError('名稱不能超過20個字符')
            return
        }
        if (trimmedName === player.display_name) {
            setIsEditingName(false)
            return
        }

        setSavingName(true)
        setNameError('')

        try {
            const updates = {
                display_name: trimmedName,
                display_name_updated_at: new Date().toISOString()
            }
            await updatePlayer(updates)
            setPlayer(prev => ({ ...prev, ...updates }))
            setIsEditingName(false)
        } catch (error) {
            console.error('Failed to update name:', error)
            setNameError('更新失敗，請稍後再試')
        } finally {
            setSavingName(false)
        }
    }

    // Start editing name
    const startEditingName = () => {
        setNewName(player.display_name)
        setNameError('')
        setIsEditingName(true)
    }

    // Cancel editing
    const cancelEditingName = () => {
        setIsEditingName(false)
        setNewName('')
        setNameError('')
    }

    // Handle avatar save
    const handleSaveAvatar = async (seed) => {
        setSavingAvatar(true)
        try {
            const updates = { avatar_seed: seed }
            await updatePlayer(updates)
            setPlayer(prev => ({ ...prev, ...updates }))
            setShowAvatarPicker(false)
        } catch (error) {
            console.error('Failed to update avatar:', error)
        } finally {
            setSavingAvatar(false)
        }
    }

    // Check if this is the current user's profile
    const isOwnProfile = currentPlayer?.id === playerId

    if (loading) {
        return (
            <div className="h-[100svh] flex flex-col items-center justify-center bg-gray-100 pb-16">
                <div className="loading-spinner"></div>
                <p className="font-body font-bold mt-4">載入中...</p>
            </div>
        )
    }

    if (!player) {
        return (
            <div className="h-[100svh] flex flex-col items-center justify-center bg-gray-100 pb-16">
                <p className="font-body font-bold mb-4">Player not found</p>
                <button
                    className="bg-orange border-comic-thin py-2 px-4 rounded-md font-bold cursor-pointer shadow-comic-sm"
                    onClick={onBack}
                >
                    Go Back
                </button>
            </div>
        )
    }

    const hexData = calculateHexagonData(stats)
    const netPoints = getNetPoints(stats)

    return (
        <div className="h-[100svh] bg-gray-100 flex flex-col overflow-hidden pb-16">
            {/* Header */}
            <header className="bg-pink border-b-[3px] border-black p-4 flex items-center gap-4 shrink-0">
                <button
                    className="bg-white border-comic-thin p-2 rounded-md cursor-pointer shadow-comic-sm hover:bg-gray-100"
                    onClick={onBack}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="font-title text-2xl m-0 flex-1">我的戰績</h1>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 scroll-section p-4 py-10">
                {/* Player Info */}
                <section className="text-center mb-6">
                    {/* Avatar with edit button */}
                    <div className="relative inline-block mb-3">
                        <div className="w-24 h-24 rounded-full border-comic-thick shadow-comic-md overflow-hidden bg-white flex items-center justify-center text-3xl font-title">
                            <img
                                src={getPlayerAvatar(player, 192)}
                                alt={player.display_name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                        {isOwnProfile && (
                            <button
                                onClick={() => setShowAvatarPicker(true)}
                                className="absolute -bottom-1 -right-1 bg-orange border-comic-medium p-1.5 rounded-full cursor-pointer shadow-comic-sm hover:brightness-110"
                                title="更改頭像"
                            >
                                <Camera size={14} />
                            </button>
                        )}
                    </div>

                    {/* Name Display/Edit Section */}
                    <div className="flex items-center justify-center gap-2 mb-1">
                        {isEditingName ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="font-title text-xl text-center border-comic-medium rounded-md px-3 py-1 w-40"
                                        maxLength={20}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveName()
                                            if (e.key === 'Escape') cancelEditingName()
                                        }}
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        disabled={savingName}
                                        className="bg-green border-comic-thin p-1.5 rounded-md cursor-pointer shadow-comic-sm hover:brightness-110 disabled:opacity-50"
                                    >
                                        <Check size={18} />
                                    </button>
                                    <button
                                        onClick={cancelEditingName}
                                        disabled={savingName}
                                        className="bg-red border-comic-thin p-1.5 rounded-md cursor-pointer shadow-comic-sm hover:brightness-110 disabled:opacity-50"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                {nameError && (
                                    <p className="text-red text-xs font-bold">{nameError}</p>
                                )}
                            </div>
                        ) : (
                            <>
                                <h2 className="font-title text-2xl m-0">{player.display_name}</h2>
                                {player.is_admin && (
                                    <span className="bg-red text-white text-[10px] py-0.5 px-2 rounded-sm border-2 border-black font-bold uppercase">Admin</span>
                                )}
                                {isOwnProfile && canChangeName() && (
                                    <button
                                        onClick={startEditingName}
                                        className="bg-yellow border-comic-thin p-1 rounded-md cursor-pointer shadow-comic-sm hover:brightness-110"
                                        title="編輯名稱"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Name change restriction notice */}
                    {isOwnProfile && !canChangeName() && !isEditingName && (
                        <p className="text-gray-400 text-xs mb-1">
                            {getDaysUntilNextChange()} 天後可再次更改名稱
                        </p>
                    )}

                    <p className="text-gray-500 text-sm mb-2">{player.email}</p>
                    <div className={`inline-block font-title text-xl py-1 px-4 rounded-md border-comic-medium shadow-comic-sm ${netPoints >= 0 ? 'bg-green text-black' : 'bg-red text-white'
                        }`}>
                        {netPoints >= 0 ? '+' : ''}{netPoints} 分
                    </div>
                </section>

                {/* Hexagon Chart */}
                <section className="mb-6">
                    <div className="flex justify-center">
                        <HexagonChart
                            data={hexData}
                            labels={['速度', '攻擊', '防守', '運氣', '魔法', '心態']}
                            size={240}
                        />
                    </div>
                    {/* Power Descriptions */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {[
                            { name: '速度', desc: '勝率', target: '35%', color: 'bg-orange' },
                            { name: '攻擊', desc: '平均番數', target: '8番', color: 'bg-red' },
                            { name: '防守', desc: '放銃率', target: '0%', color: 'bg-cyan' },
                            { name: '運氣', desc: '自摸率', target: '70%', color: 'bg-yellow' },
                            { name: '魔法', desc: '爆棚率', target: '15%', color: 'bg-pink' },
                            { name: '心態', desc: '包牌率', target: '0%', color: 'bg-green' },
                        ].map((power, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-gray-200"
                            >
                                <span
                                    className={`${power.color} text-black font-bold text-xs px-2 py-0.5 rounded border border-black`}
                                >
                                    {power.name}
                                </span>
                                <span className="text-sm text-gray-700">
                                    {power.desc} <span className="text-gray-400">({power.target})</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Stats Grid */}
                <section className="mb-6">
                    <div className="grid grid-cols-3 gap-3">
                        {(() => {
                            const games = stats?.total_games || 0
                            const matches = stats?.total_matches || 0
                            const wins = stats?.total_wins || 0
                            const winRate = hasEnoughGames(stats) ? ((wins / games) * 100).toFixed(1) : '-'
                            return [
                                { value: matches, label: '總場數' },
                                { value: games, label: '總局數' },
                                { value: wins, label: '勝利' },
                                { value: `${winRate}%`, label: '勝率' },
                                { value: stats?.total_deal_ins || 0, label: '放銃' },
                                { value: stats?.total_bao || 0, label: '包牌' },
                            ]


                        })().map((stat, i) => (
                            <div
                                key={i}
                                className={`bg-white border-comic-medium rounded-lg p-3 text-center shadow-comic-sm ${i % 2 === 0 ? '-rotate-1' : 'rotate-1'
                                    }`}
                            >
                                <span className="block font-title text-2xl">{stat.value}</span>
                                <span className="block text-xs font-bold text-gray-500 uppercase mt-1">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Limit Hands Section */}
                {stats?.total_limit_hands > 0 && (
                    <section className="mb-6">
                        <h3 className="font-title text-lg mb-3 flex items-center gap-2">
                            <span className="text-xl">🏆</span> 爆棚紀錄
                            <span className="bg-red text-white text-sm font-bold px-2 py-0.5 rounded-full">
                                {stats.total_limit_hands}
                            </span>
                        </h3>
                        <div className="bg-gradient-to-r from-red/10 to-orange/10 border-comic-medium rounded-lg p-4 shadow-comic-sm">
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(stats.hand_pattern_counts || {})
                                    .filter(([patternId]) => {
                                        // Limit hand patterns
                                        const limitPatterns = [
                                            'tian_hu', 'di_hu', 'shi_san_yao', 'jiu_lian_bao_deng',
                                            'da_si_xi', 'xiao_si_xi', 'zi_yi_se', 'qing_yao_jiu',
                                            'kan_kan_hu', 'shi_ba_luo_han', 'ba_xian_guo_hai', 'da_san_yuan'
                                        ]
                                        return limitPatterns.includes(patternId)
                                    })
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([patternId, count]) => (
                                        <div
                                            key={patternId}
                                            className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border-2 border-red/30"
                                        >
                                            <span className="font-bold text-sm text-red">{getPatternName(patternId)}</span>
                                            <span className="bg-red text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </section>
                )}

                {/* Hand Pattern Records */}
                {stats?.hand_pattern_counts && Object.keys(stats.hand_pattern_counts).length > 0 && (
                    <section>
                        <h3 className="font-title text-lg mb-3 flex items-center gap-2">
                            <span className="text-xl">🀄</span> 常用牌型
                        </h3>
                        <div className="bg-white border-comic-medium rounded-lg p-4 shadow-comic-sm">
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(stats.hand_pattern_counts)
                                    .sort((a, b) => b[1] - a[1]) // Sort by count descending
                                    .map(([patternId, count]) => (
                                        <div
                                            key={patternId}
                                            className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-300"
                                        >
                                            <span className="font-bold text-sm">{getPatternName(patternId)}</span>
                                            <span className="bg-orange text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </section>
                )}
            </div>

            {/* Avatar Picker Modal */}
            {showAvatarPicker && (
                <AvatarPicker
                    currentSeed={player.avatar_seed}
                    onSave={handleSaveAvatar}
                    onCancel={() => setShowAvatarPicker(false)}
                    saving={savingAvatar}
                />
            )}
        </div>
    )
}

export default ProfilePage
