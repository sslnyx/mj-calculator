import { useState, useEffect } from 'react'
import { RefreshCw, Check, X } from 'lucide-react'
import { getDiceBearAvatar, generateRandomSeed, getAvatarPreviews } from '../lib/avatar'

/**
 * Avatar Picker Component
 * Allows players to choose and customize their DiceBear Dylan avatar
 */
const AvatarPicker = ({ currentSeed, onSave, onCancel, saving = false }) => {
    const [previews, setPreviews] = useState([])
    const [selectedSeed, setSelectedSeed] = useState(currentSeed || generateRandomSeed())
    const [refreshing, setRefreshing] = useState(false)

    // Generate initial previews
    useEffect(() => {
        regeneratePreviews()
    }, [])

    // Regenerate all preview avatars
    const regeneratePreviews = () => {
        setRefreshing(true)
        // Keep current selection as first option, generate new ones
        const newPreviews = [
            { seed: selectedSeed, url: getDiceBearAvatar(selectedSeed, { size: 96 }) },
            ...getAvatarPreviews(11)
        ]
        setPreviews(newPreviews)
        setTimeout(() => setRefreshing(false), 300)
    }

    // Handle avatar selection
    const handleSelect = (seed) => {
        setSelectedSeed(seed)
    }

    // Handle save
    const handleSave = () => {
        onSave(selectedSeed)
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-comic-thick rounded-xl shadow-comic-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-cyan border-b-[3px] border-black p-4 flex items-center justify-between">
                    <h2 className="font-title text-xl m-0">選擇頭像</h2>
                    <button
                        onClick={onCancel}
                        className="bg-white border-comic-thin p-1.5 rounded-md cursor-pointer shadow-comic-sm hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Current Selection Preview */}
                <div className="p-4 border-b-2 border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full border-comic-thick shadow-comic-md overflow-hidden bg-white flex items-center justify-center">
                            <img
                                src={getDiceBearAvatar(selectedSeed, { size: 160 })}
                                alt="Selected Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-sm text-gray-600 mb-1">當前選擇</p>
                            <p className="text-xs text-gray-400 font-mono truncate">{selectedSeed}</p>
                        </div>
                    </div>
                </div>

                {/* Avatar Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm text-gray-500">選擇一個頭像</span>
                        <button
                            onClick={regeneratePreviews}
                            disabled={refreshing}
                            className={`bg-yellow border-comic-thin p-1.5 rounded-md cursor-pointer shadow-comic-sm hover:brightness-110 ${refreshing ? 'animate-spin' : ''}`}
                            title="生成新頭像"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        {previews.map((preview, index) => (
                            <button
                                key={preview.seed}
                                onClick={() => handleSelect(preview.seed)}
                                className={`aspect-square rounded-full overflow-hidden border-[3px] cursor-pointer transition-all hover:scale-105 ${selectedSeed === preview.seed
                                        ? 'border-orange shadow-comic-md ring-2 ring-orange ring-offset-2'
                                        : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                style={{
                                    animationDelay: `${index * 50}ms`
                                }}
                            >
                                <img
                                    src={preview.url}
                                    alt={`Avatar option ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>

                    {/* Custom Seed Input */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <label className="block font-bold text-sm text-gray-500 mb-2">
                            或輸入自定義種子
                        </label>
                        <input
                            type="text"
                            value={selectedSeed}
                            onChange={(e) => setSelectedSeed(e.target.value)}
                            placeholder="輸入任意文字..."
                            className="w-full border-comic-medium rounded-md px-3 py-2 text-sm font-mono"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            同樣的種子會生成同樣的頭像
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t-2 border-gray-200 bg-gray-50 flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        className="flex-1 bg-gray-200 border-comic-medium py-2 px-4 rounded-md font-bold cursor-pointer shadow-comic-sm hover:bg-gray-300 disabled:opacity-50"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-green border-comic-medium py-2 px-4 rounded-md font-bold cursor-pointer shadow-comic-sm hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                儲存中...
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                確認選擇
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AvatarPicker
