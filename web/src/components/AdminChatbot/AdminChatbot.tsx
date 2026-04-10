/**
 * AdminChatbot — floating AI assistant panel for the admin dashboard.
 *
 * Architecture:
 *  - Floating trigger button (fixed bottom-right)
 *  - Chat panel (slide-up, fixed positioning)
 *  - useMutation for chatMessage GraphQL mutation
 *  - Local history kept in state; last 6 turns forwarded to API
 *  - Confirmation UI for destructive actions (Delete operations)
 */
import { useRef, useState, useEffect, useCallback } from 'react'

import { useMutation } from '@redwoodjs/web'

import { cn } from 'src/lib/utils'

import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const CHAT_MESSAGE_MUTATION = gql`
  mutation ChatMessageMutation($input: ChatMessageInput!) {
    chatMessage(input: $input) {
      reply
      data
      success
      requiresConfirmation
      confirmationToken
    }
  }
`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryItem {
  role: 'user' | 'model'
  content: string
}

type MessageRole = 'user' | 'assistant' | 'system'

interface Message {
  id: string
  role: MessageRole
  content: string
  /** pending confirmation token for destructive actions */
  confirmationToken?: string
}

// ---------------------------------------------------------------------------
// Simple markdown-ish renderer (bold + newlines only)
// ---------------------------------------------------------------------------

function SimpleMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  const lines = parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    // Split on newlines and insert <br>
    const chunks = part.split('\n')
    return (
      <span key={i}>
        {chunks.map((chunk, j) => (
          <span key={j}>
            {chunk}
            {j < chunks.length - 1 && <br />}
          </span>
        ))}
      </span>
    )
  })
  return <>{parts.length > 0 ? lines : text}</>
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: Message
  onConfirm: (token: string) => void
  onCancel: (id: string) => void
  isLoading: boolean
}

function MessageBubble({
  message,
  onConfirm,
  onCancel,
  isLoading,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="tw-flex tw-justify-center">
        <span className="tw-rounded-full tw-bg-muted tw-px-3 tw-py-1 tw-text-xs tw-text-muted-foreground">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'tw-flex tw-flex-col tw-gap-1',
        isUser ? 'tw-items-end' : 'tw-items-start'
      )}
    >
      <div
        className={cn(
          'tw-max-w-[85%] tw-rounded-2xl tw-px-3 tw-py-2 tw-text-sm tw-leading-relaxed',
          isUser
            ? 'tw-rounded-tr-sm tw-bg-primary tw-text-primary-foreground'
            : 'tw-rounded-tl-sm tw-bg-muted tw-text-foreground'
        )}
      >
        <SimpleMarkdown text={message.content} />
      </div>

      {/* Confirmation buttons for destructive actions */}
      {message.confirmationToken && (
        <div className="tw-mt-1 tw-flex tw-gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={isLoading}
            onClick={() => onConfirm(message.confirmationToken!)}
          >
            Yes, delete
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isLoading}
            onClick={() => onCancel(message.id)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="tw-flex tw-items-start">
      <div className="tw-rounded-2xl tw-rounded-tl-sm tw-bg-muted tw-px-3 tw-py-2">
        <div className="tw-flex tw-h-4 tw-items-center tw-gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="tw-block tw-h-1.5 tw-w-1.5 tw-animate-bounce tw-rounded-full tw-bg-muted-foreground"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

let idCounter = 0
const nextId = () => String(++idCounter)

const WELCOME_MESSAGE: Message = {
  id: '0',
  role: 'assistant',
  content:
    'Hi! I\'m your AI admin assistant. I can help you manage products, orders, users, and view dashboard metrics.\n\nTry asking:\n• "Show me low-stock products"\n• "List recent orders"\n• "How\'s revenue this week?"',
}

export default function AdminChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [sendMessage, { loading }] = useMutation(CHAT_MESSAGE_MUTATION)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const appendMessage = useCallback((msg: Omit<Message, 'id'>) => {
    const full: Message = { ...msg, id: nextId() }
    setMessages((prev) => [...prev, full])
    return full
  }, [])

  const submit = useCallback(
    async (userText: string, confirmationToken?: string) => {
      if (!userText.trim() && !confirmationToken) return

      if (userText.trim()) {
        appendMessage({ role: 'user', content: userText.trim() })
        setInput('')
      }

      try {
        const { data } = await sendMessage({
          variables: {
            input: {
              message: userText.trim() || 'confirmed',
              history: history.slice(-6),
              confirmationToken: confirmationToken ?? null,
            },
          },
        })

        const res = data?.chatMessage
        if (!res) return

        // Update history for multi-turn context
        if (userText.trim()) {
          setHistory((prev) => [
            ...prev,
            { role: 'user', content: userText.trim() },
            { role: 'model', content: res.reply },
          ])
        }

        appendMessage({
          role: 'assistant',
          content: res.reply,
          confirmationToken: res.requiresConfirmation
            ? res.confirmationToken
            : undefined,
        })
      } catch {
        appendMessage({
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        })
      }
    },
    [appendMessage, history, sendMessage]
  )

  const handleSend = useCallback(() => {
    submit(input)
  }, [input, submit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleConfirm = useCallback(
    (token: string) => {
      // Remove confirmation buttons from the message that had them
      setMessages((prev) =>
        prev.map((m) =>
          m.confirmationToken === token
            ? { ...m, confirmationToken: undefined }
            : m
        )
      )
      submit('', token)
    },
    [submit]
  )

  const handleCancel = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              confirmationToken: undefined,
              content: m.content + '\n\n*(Cancelled)*',
            }
          : m
      )
    )
  }, [])

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE])
    setHistory([])
  }, [])

  return (
    <>
      {/* ── Floating trigger ──────────────────────────────────────────────── */}
      <button
        aria-label="Open AI assistant"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'tw-fixed tw-bottom-6 tw-right-6 tw-z-50 tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-full tw-shadow-lg tw-transition-all tw-duration-200',
          open
            ? 'tw-bg-muted tw-text-muted-foreground hover:tw-bg-muted/80'
            : 'tw-bg-primary tw-text-primary-foreground hover:tw-bg-primary/90'
        )}
      >
        {open ? (
          // X icon
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          // Sparkle/bot icon
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 12 2z" />
            <circle cx="9" cy="13" r="1" fill="currentColor" />
            <circle cx="15" cy="13" r="1" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* ── Chat panel ───────────────────────────────────────────────────── */}
      <div
        className={cn(
          'tw-fixed tw-bottom-24 tw-right-6 tw-z-50 tw-flex tw-origin-bottom-right tw-flex-col tw-rounded-2xl tw-border tw-bg-background tw-shadow-2xl tw-transition-all tw-duration-300',
          'tw-w-[min(400px,calc(100vw-3rem))]',
          open
            ? 'tw-pointer-events-auto tw-scale-100 tw-opacity-100'
            : 'tw-pointer-events-none tw-scale-95 tw-opacity-0'
        )}
        style={{ height: '520px' }}
        role="dialog"
        aria-label="AI admin assistant"
        aria-modal="false"
      >
        {/* Header */}
        <div className="tw-flex tw-shrink-0 tw-items-center tw-justify-between tw-border-b tw-px-4 tw-py-3">
          <div className="tw-flex tw-items-center tw-gap-2">
            <div className="tw-h-2 tw-w-2 tw-rounded-full tw-bg-green-500" />
            <span className="tw-text-sm tw-font-semibold">AI Assistant</span>
            <span className="tw-text-xs tw-text-muted-foreground">Gemini</span>
          </div>
          <button
            onClick={clearChat}
            className="tw-text-xs tw-text-muted-foreground tw-transition-colors hover:tw-text-foreground"
            title="Clear conversation"
          >
            Clear
          </button>
        </div>

        {/* Messages */}
        <div className="tw-min-h-0 tw-flex-1 tw-space-y-3 tw-overflow-y-auto tw-px-4 tw-py-3">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              isLoading={loading}
            />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="tw-shrink-0 tw-border-t tw-p-3">
          <div className="tw-flex tw-items-end tw-gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything… (Enter to send)"
              rows={1}
              disabled={loading}
              className="tw-max-h-[120px] tw-min-h-[40px] tw-resize-none tw-py-2 tw-text-sm"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="tw-shrink-0"
              aria-label="Send message"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </Button>
          </div>
          <p className="tw-mt-1.5 tw-text-center tw-text-[11px] tw-text-muted-foreground">
            Shift+Enter for new line · Actions may affect live data
          </p>
        </div>
      </div>
    </>
  )
}
