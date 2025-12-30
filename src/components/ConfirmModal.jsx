const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
            onClick={onCancel}
        >
            <div
                className="bg-white border-comic-thick rounded-xl p-6 w-full max-w-[300px] shadow-comic-lg transform rotate-1"
                onClick={e => e.stopPropagation()}
            >
                <header className="mb-4">
                    <h2 className="font-title text-2xl m-0">{title || '確認'}</h2>
                </header>
                <div className="mb-6">
                    <p className="font-body font-bold m-0">{message}</p>
                </div>
                <footer className="flex gap-3">
                    <button
                        className="flex-1 py-3 px-4 bg-gray-200 border-comic-thin rounded-lg font-bold text-sm cursor-pointer shadow-comic-sm transition-all duration-150 hover:bg-gray-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="flex-1 py-3 px-4 bg-red text-white border-comic-thin rounded-lg font-bold text-sm cursor-pointer shadow-comic-sm transition-all duration-150 hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                        onClick={onConfirm}
                    >
                        Confirm
                    </button>
                </footer>
            </div>
        </div>
    )
}

export default ConfirmModal
