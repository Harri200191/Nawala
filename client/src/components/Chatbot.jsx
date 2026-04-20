import { useState, useRef, useEffect, useCallback } from 'react'
import { streamChat } from '../utils/claudeApi'

const STORAGE_KEY = 'nawala_chat_history'
const MAX_STORED = 20

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-amber-500 text-black rounded-br-sm'
            : 'bg-gray-800 text-gray-200 rounded-bl-sm'
        }`}
      >
        {msg.content.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i < msg.content.split('\n').length - 1 && <br />}
          </span>
        ))}
        {msg.streaming && <span className="inline-block w-1.5 h-3.5 bg-amber-400 animate-pulse ml-0.5 rounded-sm" />}
      </div>
    </div>
  )
}

export default function Chatbot({ userProfile }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(load)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [open, messages])

  const persistMessages = useCallback((msgs) => {
    const trimmed = msgs.slice(-MAX_STORED)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    return trimmed
  }, [])

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || streaming) return

      const userMsg = { role: 'user', content: text.trim() }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setInput('')
      setStreaming(true)

      const assistantMsg = { role: 'assistant', content: '', streaming: true }
      setMessages([...newMessages, assistantMsg])

      try {
        let accumulated = ''
        const historyForApi = newMessages.map((m) => ({ role: m.role, content: m.content }))

        for await (const chunk of streamChat({
          messages: historyForApi,
          userProfile: {
            budget: userProfile?.budget
              ? `$${userProfile.budget[0]}–$${userProfile.budget[1]}`
              : 'not set',
            dietary: userProfile?.dietary || 'no preference',
            cuisines: userProfile?.cuisines || [],
            visited_places: userProfile?.visited_places?.slice(0, 5) || [],
          },
        })) {
          accumulated += chunk
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              role: 'assistant',
              content: accumulated,
              streaming: true,
            }
            return updated
          })
        }

        setMessages((prev) => {
          const finalMsgs = prev.map((m, i) =>
            i === prev.length - 1 ? { role: 'assistant', content: accumulated } : m
          )
          persistMessages(finalMsgs)
          return finalMsgs
        })
      } catch (err) {
        setMessages((prev) => {
          const errMsgs = [...prev]
          errMsgs[errMsgs.length - 1] = {
            role: 'assistant',
            content: `Sorry, something went wrong: ${err.message}`,
          }
          return errMsgs
        })
      } finally {
        setStreaming(false)
      }
    },
    [messages, streaming, userProfile, persistMessages]
  )

  const clearChat = () => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-amber-500 hover:bg-amber-400 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50"
          aria-label="Open food assistant"
        >
          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 w-80 h-[500px] bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-white font-semibold text-sm">Food Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
                title="Clear chat"
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center pt-6 space-y-2">
                <div className="text-3xl">🍽️</div>
                <p className="text-gray-400 text-sm">Ask me anything about food near you.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick actions */}
          {messages.length === 0 && (
            <div className="px-3 pb-2 flex gap-2">
              <button
                onClick={() => sendMessage('Plan my meals this week')}
                disabled={streaming}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 text-xs transition-all"
              >
                📅 Plan my week
              </button>
              <button
                onClick={() => sendMessage('What should I eat tonight?')}
                disabled={streaming}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 text-xs transition-all"
              >
                🌙 Tonight?
              </button>
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
              className="flex gap-2 items-center bg-gray-800 rounded-xl px-3 py-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about food…"
                disabled={streaming}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="text-amber-400 hover:text-amber-300 disabled:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
