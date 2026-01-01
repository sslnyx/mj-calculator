import { useState, useEffect } from 'react'
import { X, Plus, UserPlus, RefreshCw } from 'lucide-react'
import { getGuests, createGuest } from '../lib/guests'
import { getPlayerAvatar, generateRandomSeed, getDiceBearAvatar, getAvatarPreviews } from '../lib/avatar'

/**
 * Guest Select Modal
 * Allows users to select an existing guest or create a new one
 */
const GuestSelectModal = ({ isOpen, onClose, ownerId, onSelect, roomId }) => {
    const [guests, setGuests] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [view, setView] = useState('list') // 'list' or 'create'

    // Create guest form state
    const [newGuestName, setNewGuestName] = useState('')
    const [newGuestSeed, setNewGuestSeed] = useState(generateRandomSeed())
    const [avatarPreviews, setAvatarPreviews] = useState([])
    const [creating, setCreating] = useState(false)

    // Fetch guests on open
    useEffect(() => {
        if (isOpen && ownerId) {
            fetchGuests()
            regenerateAvatars()
        }
    }, [isOpen, ownerId])

    const fetchGuests = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getGuests(ownerId)
            setGuests(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const regenerateAvatars = () => {
        const seed = generateRandomSeed()
        setNewGuestSeed(seed)
        const previews = [
            { seed, url: getDiceBearAvatar(seed, { size: 64 }) },
            ...getAvatarPreviews(7)
        ]
        setAvatarPreviews(previews)
    }

    const handleCreateGuest = async () => {
        if (!newGuestName.trim()) {
            setError('請輸入名稱')
            return
        }

        setCreating(true)
        setError(null)
        try {
            const guest = await createGuest(newGuestName.trim(), ownerId, newGuestSeed)
            onSelect(guest)
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setCreating(false)
        }
    }

    const handleSelectExisting = (guest) => {
        onSelect(guest)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-comic-thick rounded-xl shadow-comic-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-pink border-b-[3px] border-black p-4 flex items-center justify-between shrink-0">
                    <h2 className="font-title text-xl m-0">
                        {view === 'list' ? '選擇玩家' : '新增玩家'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="bg-white border-comic-thin p-1.5 rounded-md cursor-pointer shadow-comic-sm hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red text-white p-2 text-sm font-bold text-center">
                        {error}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {view === 'list' ? (
                        <>
                            {/* Create New Guest Button */}
                            <button
                                onClick={() => {
                                    setView('create')
                                    setNewGuestName('')
                                    regenerateAvatars()
                                }}
                                className="w-full bg-cyan border-comic-medium p-3 rounded-lg font-bold cursor-pointer shadow-comic-sm hover:brightness-110 flex items-center justify-center gap-2 mb-4"
                            >
                                <UserPlus size={20} />
                                新增玩家
                            </button>

                            {/* Existing Guests */}
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="loading-spinner mx-auto mb-2"></div>
                                    <p className="text-gray-500 text-sm">載入中...</p>
                                </div>
                            ) : guests.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p className="font-bold">暫時冇玩家</p>
                                    <p className="text-sm mt-1">新增你嘅第一個玩家!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                                        我嘅玩家 ({guests.length})
                                    </p>
                                    {guests.map(guest => (
                                        <button
                                            key={guest.id}
                                            onClick={() => handleSelectExisting(guest)}
                                            className="w-full bg-white border-comic-medium p-3 rounded-lg cursor-pointer shadow-comic-sm hover:bg-gray-50 flex items-center gap-3 text-left"
                                        >
                                            <img
                                                src={getPlayerAvatar(guest, 80)}
                                                alt=""
                                                className="w-10 h-10 rounded-full border-2 border-black"
                                                referrerPolicy="no-referrer"
                                            />
                                            <span className="font-bold flex-1">{guest.display_name}</span>
                                            <Plus size={18} className="text-gray-400" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Create View */
                        <div className="space-y-4">
                            {/* Back Button */}
                            <button
                                onClick={() => setView('list')}
                                className="text-sm text-gray-500 hover:text-gray-700 font-bold"
                            >
                                ← 返回
                            </button>

                            {/* Avatar Selection */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block font-bold text-sm text-gray-500">
                                        選擇頭像
                                    </label>
                                    <button
                                        onClick={regenerateAvatars}
                                        className="bg-yellow border-comic-thin p-1 rounded-md cursor-pointer shadow-comic-sm hover:brightness-110"
                                        title="換一批"
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {avatarPreviews.map((preview, i) => (
                                        <button
                                            key={preview.seed}
                                            onClick={() => setNewGuestSeed(preview.seed)}
                                            className={`aspect-square rounded-full overflow-hidden border-[3px] cursor-pointer transition-all hover:scale-105 ${newGuestSeed === preview.seed
                                                ? 'border-orange shadow-comic-md ring-2 ring-orange ring-offset-2'
                                                : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                        >
                                            <img
                                                src={preview.url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name Input */}
                            <div>
                                <label className="block font-bold text-sm text-gray-500 mb-2">
                                    名稱
                                </label>
                                <input
                                    type="text"
                                    value={newGuestName}
                                    onChange={(e) => setNewGuestName(e.target.value)}
                                    placeholder="輸入玩家名稱..."
                                    className="w-full border-comic-medium rounded-md px-3 py-2"
                                    maxLength={20}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {view === 'create' && (
                    <div className="p-4 border-t-2 border-gray-200 bg-gray-50 flex gap-3 shrink-0">
                        <button
                            onClick={() => setView('list')}
                            disabled={creating}
                            className="flex-1 bg-gray-200 border-comic-medium py-2 px-4 rounded-md font-bold cursor-pointer shadow-comic-sm hover:bg-gray-300 disabled:opacity-50"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleCreateGuest}
                            disabled={creating || !newGuestName.trim()}
                            className="flex-1 bg-green border-comic-medium py-2 px-4 rounded-md font-bold cursor-pointer shadow-comic-sm hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {creating ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    新增中...
                                </>
                            ) : (
                                <>
                                    <UserPlus size={16} />
                                    新增
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default GuestSelectModal
