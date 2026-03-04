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
}

export default function Home() {

  const [message, setMessage] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [department, setDepartment] = useState("Finance")

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const link = document.createElement("link")
    link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap"
    link.rel = "stylesheet"
    document.head.appendChild(link)
  }, [])

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
      messages: []
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
        messages: []
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
    setIsThinking(true)

    const conv = conversations.find((c) => c.id === conversationId)
    const session_id = conv?.session_id || Date.now().toString()

    try {

      const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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
        text: "Error connecting to backend."
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

        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">

          <div className="flex items-center gap-3">

            <img src="/logo.png" alt="Honey's AI" className="w-[42px] h-[42px]" />

            <div>

              <div className="text-[25px] font-semibold leading-none tracking-tight">
                <span className="text-[#B8922A]">Honey's AI</span>
                <span className="text-[#111111] ml-1">Onboard</span>
              </div>

              <div className="flex items-center gap-[6px] mt 0.5 text-[12px] text-gray-600">
                <span className="text-[#B8922A]">──</span>
                Enterprise Onboarding Intelligence
                <span className="text-[#B8922A]">──</span>
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
          </select>

        </div>

        {/* BODY */}

        <div className="flex h-[600px]">

          {/* SIDEBAR */}

          <div className="w-[250px] bg-[#1C2230] text-white p-5 flex flex-col">

            <button
              onClick={handleNewChat}
              className="w-full mb-5 py-2 px-4 rounded-lg border border-[#B8922A] text-[#B8922A] hover:bg-[#B8922A] hover:text-white"
            >
              + New Chat
            </button>

            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Recent Conversations
            </h2>

            <div className="space-y-2 text-sm overflow-y-auto">

              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className="px-3 py-2 rounded-md cursor-pointer text-gray-300 hover:bg-[#2A3447]"
                >
                  {conv.title}
                </div>
              ))}

            </div>

          </div>

          {/* CHAT */}

          <div className="flex-1 bg-[#FAFAFA] p-6 flex flex-col overflow-y-auto">

            {(!activeConversation || activeConversation.messages.length === 0) && (

              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 max-w-xl mb-4 flex items-start gap-3">

                  <div className="w-8 h-8 rounded-full bg-[#B8922A] flex items-center justify-center text-white text-sm font-bold">
                    H
                  </div>

                  <p className="text-gray-700 pt-1">
                    Hi 👋 Welcome to Honey's AI Onboard. What can I help you with today?
                  </p>

                </div>

                <div className="max-w-xl">

                  <p className="text-sm font-medium text-gray-600 mb-3">
                    Ask something like:
                  </p>

                  <div className="flex flex-wrap gap-2">

                    {suggestions.map((q, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(q)}
                        className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-full hover:border-[#B8922A] hover:text-[#B8922A]"
                      >
                        {q}
                      </button>
                    ))}

                  </div>

                </div>

              </>
            )}

            {activeConversation && activeConversation.messages.map((msg, i) => (

              <div key={i} className="mb-4">

                <div className={`p-3 rounded-lg text-sm ${
                  msg.role === "user"
                    ? "bg-[#B8922A] text-white ml-auto w-fit"
                    : "bg-white border border-gray-200"
                }`}>

                  {msg.text}

                  {msg.source && (

                    <div className="mt-2 text-xs text-gray-500">

                      <div>Source: {msg.source}</div>
                      <div>Confidence: {msg.confidence}</div>
                      <div>{msg.note}</div>

                    </div>

                  )}

                </div>

              </div>

            ))}

            {isThinking && (
              <div className="text-sm text-gray-500 mt-3">
                Honey AI is thinking...
              </div>
            )}

          </div>

        </div>

        {/* INPUT */}

        <div className="border-t border-gray-200 p-4 flex gap-3 bg-white">

          <input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm"
            placeholder="Type your question..."
          />

          <button
            onClick={() => handleSend()}
            className="bg-[#B8922A] text-white px-5 py-2 rounded-lg"
          >
            Send
          </button>

        </div>

      </div>

    </div>
  )
}