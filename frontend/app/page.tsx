"use client"

import { useState, useRef, useEffect } from "react"

type Message = {
  role: "user" | "ai"
  text: string
  source?: string
  confidence?: string
  note?: string
}

type Conversation = {
  id: string
  title: string
  session_id: string
  messages: Message[]
  createdAt: number
}

const sourceMap: Record<string, string> = {
  "employee_handbook_general.txt": "Employee Handbook",
  "finance_expense_policy.txt": "Finance Expense Policy",
  "finance_salary_adjustment_protocol.txt": "Salary Adjustment Protocol",
  "compliance_code_of_conduct.txt": "Code of Conduct",
  "compliance_internal_investigation_protocol.txt": "Internal Investigation Policy",
  "compliance_audit_operations_guide.txt": "Audit Operations Guide",
  "it_systems_and_tools.txt": "IT Systems and Tools"
}

const confidenceStyles: Record<string, { bg: string; text: string; dot: string }> = {
  high:   { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500"  },
  medium: { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500"  },
  low:    { bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-500"    },
}

const thinkingQuips = [
  "Reading through the entire employee handbook... there's a lot 📚",
  "Checking every policy twice, just to be sure 🔍",
  "Consulting the compliance gods for a moment 🏛️",
  "Digging through the fine print so you don't have to 🕵️",
  "Almost there... the answer is hiding somewhere in chapter 7 📖",
  "Cross-referencing three policies at once, bear with me ⚖️",
  "Your answer is being carefully extracted from 200 pages of policy 😅",
  "Good things take time. So do thorough policy checks ⏳",
]

const getTimeLabel = (timestamp: number) => {
  const diffMs = Date.now() - timestamp
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return "Today"
}

export default function Home() {

  const [message, setMessage] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [department, setDepartment] = useState("Finance")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [showQuip, setShowQuip] = useState(false)
  const [quipIndex, setQuipIndex] = useState(0)
  const [, setTick] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const quipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const quipCycleRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const link = document.createElement("link")
    link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&display=swap"
    link.rel = "stylesheet"
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversations, isThinking, showQuip])

  // Live timestamps
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  // Quip timer
  useEffect(() => {
    if (isThinking) {
      setShowQuip(false)
      setQuipIndex(Math.floor(Math.random() * thinkingQuips.length))

      quipTimerRef.current = setTimeout(() => {
        setShowQuip(true)
        quipCycleRef.current = setInterval(() => {
          setQuipIndex(Math.floor(Math.random() * thinkingQuips.length))
        }, 4000)
      }, 5000)

    } else {
      setShowQuip(false)
      if (quipTimerRef.current) clearTimeout(quipTimerRef.current)
      if (quipCycleRef.current) clearInterval(quipCycleRef.current)
    }

    return () => {
      if (quipTimerRef.current) clearTimeout(quipTimerRef.current)
      if (quipCycleRef.current) clearInterval(quipCycleRef.current)
    }
  }, [isThinking])

  const suggestions = [
    "When are employees paid?",
    "What tools track attendance?",
    "What is the leave policy?",
    "How do I request time off?",
    "Where can I find company policies?"
  ]

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  )

  const handleNewChat = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "New conversation",
      session_id: Date.now().toString(),
      messages: [],
      createdAt: Date.now()
    }
    setConversations((prev) => [newConv, ...prev])
    setActiveConversationId(newConv.id)
  }

  const handleSuggestionClick = (q: string) => {
    handleSend(q)
  }

  const handleSend = async (directMessage?: string) => {
    const textToSend = directMessage || message
    if (!textToSend.trim()) return

    let conversationId = activeConversationId

    if (!conversationId) {
      const newConv: Conversation = {
        id: Date.now().toString(),
        title: textToSend.slice(0, 30),
        session_id: Date.now().toString(),
        messages: [],
        createdAt: Date.now()
      }
      setConversations((prev) => [newConv, ...prev])
      setActiveConversationId(newConv.id)
      conversationId = newConv.id
    }

    const userMsg: Message = { role: "user", text: textToSend }

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, userMsg] }
          : conv
      )
    )

    setMessage("")
    inputRef.current?.focus()
    setIsThinking(true)

    const conv = conversations.find((c) => c.id === conversationId)
    const session_id = conv?.session_id || Date.now().toString()

    try {
      const response = await fetch("https://honeys-ai-backend-docker.onrender.com/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: textToSend,
          user_department: department,
          session_id: session_id
        })
      })

      const data = await response.json()

      const aiMsg: Message = {
        role: "ai",
        text: data.answer,
        source: data.source_policy,
        confidence: data.confidence,
        note: data.verification_note
      }

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, messages: [...conv.messages, aiMsg] }
            : conv
        )
      )

    } catch {
      const aiMsg: Message = {
        role: "ai",
        text: "Error connecting to backend. Please try again."
      }
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, messages: [...conv.messages, aiMsg] }
            : conv
        )
      )
    }

    setIsThinking(false)
  }

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex items-center justify-center p-8">

      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-md overflow-hidden flex flex-col border-t-4 border-[#B8922A]">

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">

          <div className="flex items-center gap-3">

            <img
              src="/logo.png"
              alt="Honey's AI"
              className="w-[42px] h-[42px] object-contain"
            />

            <div className="flex flex-col justify-center">

              <div
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-[25px] font-semibold leading-none tracking-tight"
              >
                <span className="text-[#B8922A]">Honey's AI</span>
                <span className="text-[#111111] font-normal ml-1">Onboard</span>
              </div>

              <div className="flex items-center gap-[6px] mt-0.5 leading-none">
                <span className="text-[#B8922A] text-[13px] font-light">──</span>
                <span
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
                  className="text-[13.5px] text-[#1a1a1a] font-normal tracking-[0.08em]"
                >
                  Enterprise Onboarding Intelligence
                </span>
                <span className="text-[#B8922A] text-[13px] font-light">──</span>
              </div>

            </div>

          </div>

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white shadow-sm"
          >
            <option>Finance</option>
            <option>Compliance</option>
            <option>HR</option>
            <option>IT</option>
          </select>

        </div>


        {/* BODY */}
        <div className="flex h-[600px]">

          {/* SIDEBAR */}
          <div className="w-[250px] bg-[#1C2230] text-white p-5 flex flex-col">

            <button
              onClick={handleNewChat}
              className="w-full mb-5 py-2 px-4 rounded-lg border border-[#B8922A] text-[#B8922A] text-sm font-medium hover:bg-[#B8922A] hover:text-white transition flex items-center justify-center gap-2"
            >
              <span className="text-lg leading-none">+</span>
              New Chat
            </button>

            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Recent Conversations
            </h2>

            <div className="space-y-2 text-sm overflow-y-auto flex-1">

              {conversations.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center mt-10 px-2">
                  <div className="w-8 h-8 rounded-full bg-[#2A3447] flex items-center justify-center mb-3">
                    <span className="text-gray-500 text-sm">💬</span>
                  </div>
                  <p className="text-gray-500 text-xs font-medium">No conversations yet</p>
                  <p className="text-gray-600 text-[11px] mt-1">Start a new chat above</p>
                </div>
              )}

              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`px-3 py-2 rounded-md cursor-pointer transition ${
                    conv.id === activeConversationId
                      ? "bg-[#2A3447] text-white"
                      : "text-gray-400 hover:bg-[#2A3447] hover:text-white"
                  }`}
                >
                  <div className="text-sm truncate">{conv.title}</div>
                  <div className="text-[10px] text-gray-500 mt-[2px]">
                    {getTimeLabel(conv.createdAt)}
                  </div>
                </div>
              ))}

            </div>

          </div>


          {/* CHAT AREA */}
          <div className="flex-1 bg-[#FAFAFA] p-6 flex flex-col overflow-y-auto">

            {/* WELCOME + SUGGESTIONS */}
            {(!activeConversation || activeConversation.messages.length === 0) && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 max-w-xl mb-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#B8922A] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    H
                  </div>
                  <p className="text-gray-700 pt-1">
                    Hi 👋 Welcome to Honey's AI Onboard. What can I help you with today?
                  </p>
                </div>

                <div className="max-w-xl mb-6">
                  <p className="text-sm font-medium text-gray-600 mb-3">Ask something like:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((q, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(q)}
                        className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-full hover:border-[#B8922A] hover:text-[#B8922A] transition"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}


            {/* CONVERSATION THREAD */}
            {activeConversation?.messages.map((msg, i) => (

              <div key={i} className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                {msg.role === "ai" && (
                  <div className="w-8 h-8 rounded-full bg-[#B8922A] flex items-center justify-center text-white text-sm font-bold shrink-0 mr-3 mt-1">
                    H
                  </div>
                )}

                <div className={`px-4 py-3 rounded-xl text-sm max-w-sm ${
                  msg.role === "user"
                    ? "bg-[#B8922A] text-white rounded-tr-none"
                    : "bg-white border border-gray-200 shadow-sm text-gray-700 rounded-tl-none"
                }`}>

                  {msg.text}

                  {msg.source && (
                    <div className="mt-3 pt-2 border-t border-gray-100 text-xs space-y-1.5">

                      <div className="flex items-center gap-1">
                        <span className="text-[#B8922A] font-medium">📄 Source:</span>
                        <span className="text-gray-600">{sourceMap[msg.source ?? ""] || msg.source}</span>
                      </div>

                      {msg.confidence && (() => {
                        const key = msg.confidence.toLowerCase()
                        const style = confidenceStyles[key] || confidenceStyles["medium"]
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#B8922A] font-medium">✓ Confidence:</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${style.bg} ${style.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                              {msg.confidence.charAt(0).toUpperCase() + msg.confidence.slice(1)}
                            </span>
                          </div>
                        )
                      })()}

                      {msg.note && (
                        <div className="text-gray-400 italic">{msg.note}</div>
                      )}

                    </div>
                  )}

                </div>

              </div>

            ))}


            {/* THINKING INDICATOR + QUIPS */}
            {isThinking && (
              <div className="flex flex-col gap-2 mb-4">

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#B8922A] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    H
                  </div>
                  <div className="bg-white border border-gray-200 shadow-sm px-4 py-3 rounded-xl rounded-tl-none flex items-center gap-2">
                    <span className="text-xs text-gray-400">Honey AI is analyzing company policies</span>
                    <span className="flex gap-1 ml-1">
                      <span className="w-1.5 h-1.5 bg-[#B8922A] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-[#B8922A] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-[#B8922A] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </span>
                  </div>
                </div>

                {/* QUIP — appears after 5s, cycles every 4s */}
                {showQuip && (
                  <div className="flex items-center gap-3 ml-11">
                    <div
                      key={quipIndex}
                      className="text-xs text-gray-400 italic px-4 py-2 bg-white border border-dashed border-gray-200 rounded-xl rounded-tl-none animate-pulse"
                    >
                      {thinkingQuips[quipIndex]}
                    </div>
                  </div>
                )}

              </div>
            )}

            <div ref={bottomRef} />

          </div>

        </div>


        {/* INPUT BAR */}
        <div className="border-t border-gray-200 p-4 flex gap-3 bg-white">
          <input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8922A]"
            placeholder="Type your question..."
          />
          <button
            onClick={() => handleSend()}
            className="bg-[#B8922A] hover:bg-[#a07d24] text-white px-5 py-2 rounded-lg font-medium transition"
          >
            Send
          </button>
        </div>

      </div>

    </div>
  )
}