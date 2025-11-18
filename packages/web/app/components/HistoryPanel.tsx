'use client'
import { useState, useEffect } from 'react'
import { getHistory, deleteFromHistory, clearHistory, type SweepSession } from '@/lib/history'

interface HistoryPanelProps {
  onLoadSession: (session: SweepSession) => void
}

export default function HistoryPanel({ onLoadSession }: HistoryPanelProps) {
  const [history, setHistory] = useState<SweepSession[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const refreshHistory = () => {
    setHistory(getHistory())
  }

  const handleDelete = (id: string) => {
    deleteFromHistory(id)
    refreshHistory()
  }

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      clearHistory()
      refreshHistory()
    }
  }

  const handleLoad = (session: SweepSession) => {
    onLoadSession(session)
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-primary-600 text-white rounded-lg shadow-lg hover:bg-primary-700 transition-colors font-medium z-50"
      >
        📋 History ({history.length})
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Sweep History</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg">No saved sessions yet</p>
              <p className="text-sm mt-2">Your sweep configurations will appear here automatically</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((session) => (
                <div
                  key={session.id}
                  className="card hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleLoad(session)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">
                        {new Date(session.timestamp).toLocaleString()}
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-bold text-gray-700">X:</span> {session.xPath} = {session.xVals}
                      </div>
                      <div className="text-sm">
                        <span className="font-bold text-gray-700">Y:</span> {session.yPath} = {session.yVals}
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        {session.planCount} variants
                        {session.completedCount !== undefined && ` • ${session.completedCount} completed`}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(session.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={handleClearAll}
            disabled={history.length === 0}
            className={`btn ${history.length === 0 ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-danger'}`}
          >
            Clear All
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
