import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/** Reusable centered modal with the shared dimming mask. */
export default function Modal({ open, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div className={'mask' + (open ? ' on' : '')} onClick={onClose} />
      <div className={'modal' + (open ? ' on' : '')} role="dialog" aria-modal="true">
        <button className="close" onClick={onClose} aria-label="关闭">
          ✕
        </button>
        {open && children}
      </div>
    </>
  )
}
