import { useState } from 'react'

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>{title || 'Confirm'}</h2>
                </header>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <footer className="modal-footer">
                    <button className="cancel-btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="submit-btn danger" onClick={onConfirm}>
                        Confirm
                    </button>
                </footer>
            </div>
        </div>
    )
}

export default ConfirmModal
