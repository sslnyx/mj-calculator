import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import HexagonChart from '../components/HexagonChart'
import AvatarPicker from '../components/AvatarPicker'
import { ArrowLeft, Pencil, Check, X, Camera } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getPlayerAvatar } from '../lib/avatar'

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
            .single()

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

    // Check if the user can change their name (once per week)
    const canChangeName = () => {
        if (!player?.display_name_updated_at) return true
        const lastUpdate = new Date(player.display_name_updated_at)
        const now = new Date()
        const weekInMs = 7 * 24 * 60 * 60 * 1000
        return (now - lastUpdate) >= weekInMs
    }

    // Get days until next name change
    const getDaysUntilNextChange = () => {
        if (!player?.display_name_updated_at) return 0
        const lastUpdate = new Date(player.display_name_updated_at)
        const now = new Date()
        const weekInMs = 7 * 24 * 60 * 60 * 1000
        const timePassed = now - lastUpdate
        const remaining = weekInMs - timePassed
        return Math.ceil(remaining / (24 * 60 * 60 * 1000))
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

    // Calculate Hexagon values (0-100 scale)
    const calculateHexagonData = () => {
        if (!stats) return [0, 0, 0, 0, 0, 0]

        const rounds = stats.total_games || 1
        const wins = stats.total_wins || 1

        // Speed: Win Rate (35% = 100%)
        const winRate = ((stats.total_wins || 0) / rounds) * 100
        const speed = Math.min(100, (winRate / 35) * 100)

        // Attack: Avg Fan (8 fan = 100%)
        const avgFan = (stats.total_fan_value || 0) / wins
        const attack = Math.min(100, (avgFan / 8) * 100)

        // Defense: Deal-in Avoidance (0% = 100%, 20% = 0%)
        const dealInRate = ((stats.total_deal_ins || 0) / rounds) * 100
        const defense = Math.max(0, 100 - (dealInRate / 40) * 100)

        // Luck: Zimo Rate (70% = 100%)
        const zimoRate = ((stats.total_zimo || 0) / wins) * 100
        const luck = Math.min(100, (zimoRate / 70) * 100)

        // Magic: Pattern diversity & special hands
        // Base: Limit hands contribute 50%, patterns contribute other 50%
        const limitRate = ((stats.total_limit_hands || 0) / wins) * 100
        const limitScore = Math.min(50, (limitRate / 15) * 50)

        // Pattern score: weight different patterns
        const patternWeights = {
            shi_san_yao: 5, jiu_lian_bao_deng: 5, da_si_xi: 5, da_san_yuan: 5, zi_yi_se: 4, kan_kan_hu: 4, // Limit hands
            qing_yi_se: 3, xiao_san_yuan: 3, // High value
            hun_yi_se: 2, dui_dui_hu: 2, hua_hu: 2, // Medium value
            ping_hu: 1, wu_hua: 1, fan_zi: 1, qiang_gang: 2, gang_shang_hua: 2, hai_di_lao_yue: 2 // Others
        }
        let patternScore = 0
        if (stats.hand_pattern_counts) {
            Object.entries(stats.hand_pattern_counts).forEach(([pattern, count]) => {
                patternScore += (patternWeights[pattern] || 1) * count
            })
        }
        // Cap pattern score contribution at 50, scale so 25 points = 50%
        const patternContribution = Math.min(50, (patternScore / 25) * 50)
        const magic = Math.min(100, limitScore + patternContribution)

        // Sanity: Bao Avoidance (0% = 100%, 10% = 0%)
        const baoRate = ((stats.total_bao || 0) / rounds) * 100
        const sanity = Math.max(0, 100 - (baoRate / 10) * 100)

        return [speed, attack, defense, luck, magic, sanity]
    }

    if (loading) {
        return (
            <div className="h-[100svh] flex flex-col items-center justify-center bg-gray-100 pb-16">
                <div className="loading-spinner"></div>
                <p className="font-body font-bold mt-4">Loading...</p>
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

    const hexData = calculateHexagonData()
    const netPoints = (stats?.total_points_won || 0) - (stats?.total_points_lost || 0)

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
                        {netPoints >= 0 ? '+' : ''}{netPoints} pts
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
                            const wins = stats?.total_wins || 0
                            const winRate = games > 0 ? ((wins / games) * 100).toFixed(1) : '0.0'
                            return [
                                { value: games, label: '總局數' },
                                { value: wins, label: '勝利' },
                                { value: stats?.total_zimo || 0, label: '自摸' },
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
                                    .map(([patternId, count]) => {
                                        const patternNames = {
                                            qing_yi_se: '清一色',
                                            xiao_san_yuan: '小三元',
                                            hun_yi_se: '混一色',
                                            dui_dui_hu: '對對糊',
                                            ping_hu: '平糊',
                                            hua_hu: '花糊',
                                            shi_san_yao: '十三幺',
                                            jiu_lian_bao_deng: '九蓮寶燈',
                                            da_si_xi: '大四喜',
                                            da_san_yuan: '大三元',
                                            zi_yi_se: '字一色',
                                            kan_kan_hu: '坎坎胡',
                                            wu_hua: '無花',
                                            fan_zi: '番子',
                                            qiang_gang: '搶槓',
                                            gang_shang_hua: '槓上開花',
                                            hai_di_lao_yue: '海底撈月'
                                        }
                                        return (
                                            <div
                                                key={patternId}
                                                className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-300"
                                            >
                                                <span className="font-bold text-sm">{patternNames[patternId] || patternId}</span>
                                                <span className="bg-orange text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
                                            </div>
                                        )
                                    })}
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
