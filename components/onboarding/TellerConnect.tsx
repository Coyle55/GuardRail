'use client'

declare global {
  interface Window {
    TellerConnect: {
      setup: (config: {
        applicationId: string
        environment?: 'sandbox' | 'development' | 'production'
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
      environment: (process.env.NEXT_PUBLIC_TELLER_ENV as 'sandbox' | 'development' | 'production') ?? 'sandbox',
      onSuccess: (enrollment) => onSuccess(enrollment.accessToken),
    })
    connect.open()
  }

  return (
    <button onClick={handleClick} disabled={disabled} className="gr-btn-primary">
      {label}
    </button>
  )
}
