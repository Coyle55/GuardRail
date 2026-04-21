'use client'

declare global {
  interface Window {
    TellerConnect: {
      setup: (config: {
        applicationId: string
        onSuccess: (enrollment: { accessToken: string }) => void
        onExit?: () => void
      }) => { open: () => void }
    }
  }
}

interface Props {
  onSuccess: (accessToken: string) => void
  label: string
  disabled?: boolean
}

export function TellerConnect({ onSuccess, label, disabled }: Props) {
  function handleClick() {
    if (!window.TellerConnect) {
      console.error('Teller Connect script not loaded')
      return
    }
    const connect = window.TellerConnect.setup({
      applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID!,
      onSuccess: (enrollment) => onSuccess(enrollment.accessToken),
    })
    connect.open()
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-xl transition"
    >
      {label}
    </button>
  )
}
