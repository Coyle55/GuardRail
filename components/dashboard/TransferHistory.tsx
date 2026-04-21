'use client'

import { Transfer } from '@/types'
import { useState } from 'react'

interface Props {
  transfers: Transfer[]
}

const PAGE_SIZE = 10

const statusStyles: Record<Transfer['status'], string> = {
  completed: 'bg-green-900 text-green-300',
  pending: 'bg-yellow-900 text-yellow-300',
  failed: 'bg-red-900 text-red-300',
}

export function TransferHistory({ transfers }: Props) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(transfers.length / PAGE_SIZE)
  const visible = transfers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Transfer History</h2>

      {transfers.length === 0 ? (
        <p className="text-gray-500 text-sm">No transfers yet. Waiting for your first bet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 pr-4 font-medium">Date</th>
                  <th className="text-left py-2 pr-4 font-medium">Sportsbook</th>
                  <th className="text-right py-2 pr-4 font-medium">Bet</th>
                  <th className="text-right py-2 pr-4 font-medium">Saved</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} className="border-b border-gray-800 last:border-0">
                    <td className="py-3 pr-4 text-gray-300">
                      {t.createdAt.toDate().toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 text-gray-300">{t.merchant}</td>
                    <td className="py-3 pr-4 text-right text-gray-300">
                      ${t.triggerAmount.toFixed(2)}
                    </td>
                    <td className="py-3 pr-4 text-right text-white font-medium">
                      ${t.amount.toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[t.status]}`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="disabled:opacity-30 hover:text-white transition"
              >
                ← Previous
              </button>
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="disabled:opacity-30 hover:text-white transition"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
