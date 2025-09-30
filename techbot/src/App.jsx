import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import wingstech from "./assets/wingstech.png";
import {
  Bot,
  ChevronLeft,
  Send,
  Sparkles,
  MessageCircle,
  Zap,
  BrushCleaning
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";
import userLogo  from './assets/user.jpg'
const wingstechlogo = wingstech;
const userAvatar = userLogo;

function App() {
  const BASE_URL = import.meta.env.VITE_PROD_URL || import.meta.env.VITE_LOCAL_URL;
  // Get userId from localStorage or generate a new one
  let userId = localStorage.getItem("chatUserId");
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem("chatUserId", userId);
  }

  // Load previous chat messages from localStorage
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`chatMessages_${userId}`);
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: "initial",
            role: "assistant",
            content:
              "Hey there! 👋 I'm your Wings Tech assistant. How can I help you today?",
            future_actions: [
              "Tell me about your services",
              "Get support",
              "Schedule a demo",
            ],
          },
        ];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist chat to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem(`chatMessages_${userId}`, JSON.stringify(messages));
  }, [messages, userId]);

 const sendQuery = async (queryText) => {
  if (!queryText.trim()) return;

  const userMsgId = uuidv4();
  const botTypingId = uuidv4();

  // 1️⃣ Immediately add user message
  const userMessage = {
    id: userMsgId,
    role: "user",
    content: queryText,
  };

  // 2️⃣ Immediately add typing indicator
  const typingMessage = {
    id: botTypingId,
    role: "assistant",
    content: "",
    isTyping: true,
  };

  // Update state once: user + typing
  setMessages((prev) => [...prev, userMessage, typingMessage]);
  setInput("");
  setLoading(true);

  // 3️⃣ Fetch bot response asynchronously, no blocking
  axios
    .post(`${BASE_URL}`  , { query: queryText, userId })
    .then((res) => {
      const botReply = res.data.answer || "⚠️ Sorry, I didn’t get that.";
      const futureActions = res.data.future_actions || [];

      // Replace typing bubble with real response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botTypingId
            ? { ...msg, content: botReply, future_actions: futureActions, isTyping: false }
            : msg
        )
      );
    })
    .catch((err) => {
      console.error(err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botTypingId
            ? {
                ...msg,
                content: "⚠️ Error connecting to server.",
                future_actions: [],
                isTyping: false,
              }
            : msg
        )
      );
    })
    .finally(() => setLoading(false));
};

  const handleSend = () => sendQuery(input);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(`chatMessages_${userId}`);
  };

  return (
    <div className="flex h-screen w-screen justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl h-full flex flex-col shadow-2xl border-0 bg-white/80 backdrop-blur-xl overflow-hidden pt-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full transition-all duration-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10 ring-2 ring-white/30">
                  <AvatarImage src={wingstechlogo} alt="Wings Tech" />
                  <AvatarFallback className="bg-white text-blue-600 font-bold">
                    WT
                  </AvatarFallback>
                </Avatar>
                {/* <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" /> */}
              </div>
              <div>
                <h1 className="font-semibold text-lg">Wings Bot</h1>
                <p className="text-blue-100 text-sm flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Assistant
                </p>
              </div>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-white/20 text-white border-white/30"
          >
            <Zap className="h-3 w-3 mr-1" />
            Online
          </Badge>

          <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="ml-2 bg-white/20 text-white border-white/30 hover:bg-white/20  border-white/30 hover:text-white"
            >
              <BrushCleaning/>
            </Button>
        </div>

        {/* Chat Messages */}
        <CardContent className="flex-1 p-0 relative overflow-hidden">
          <div className="h-full overflow-y-auto p-6 space-y-6 scrollbar-thin scrollhide scrollbar-thumb-slate-300 scrollbar-track-transparent">
            <AnimatePresence mode="popLayout">
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  
                  className="flex gap-4"
                >
                  {msg.role === "assistant" && (
                    <Avatar className="h-8 w-8 mt-1 ring-2 ring-blue-100">
                      <AvatarImage src={wingstechlogo} alt="Assistant" />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        WT
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`flex-1 ${
                      msg.role === "user" ? "flex justify-end" : ""
                    }`}
                  >
                    {msg.isTyping ? (
                      <motion.div
                        className="flex items-center gap-2 px-4 py-3 bg-slate-100 rounded-2xl rounded-bl-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 bg-slate-400 rounded-full"
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.2,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-slate-500 text-sm">
                          Writing...
                        </span>
                      </motion.div>
                    ) : (
                      <div>
                        {/* Markdown Rendering */}
                        <div
                          className={`px-4 py-3 rounded-2xl max-w-md whitespace-pre-wrap text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md shadow-lg"
                              : "bg-slate-50 text-slate-800 rounded-bl-md border border-slate-200"
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            <div className="prose prose-sm m-0 p-0">
                              <ReactMarkdown
                                components={{
                                  ul: ({ node, ...props }) => (
                                    <ul className="list-disc ml-4 mb-0" {...props} />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="mb-1" {...props} />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p className="mb-2 last:mb-0" {...props} />
                                  ),
                                  a: ({ node, ...props }) => (
                                    <a
                                      {...props}
                                      className="text-blue-600  hover:underline"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    />
                                  ),
                                }}
                              >
                                {Array.isArray(msg.content)
                                  ? msg.content.join("\n")
                                  : msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>

                        {/* Future Actions */}
                        {msg.role === "assistant" &&
                          msg.future_actions?.length > 0 && (
                            <motion.div
                              className="flex flex-wrap gap-2 mt-3"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 }}
                            >
                              {msg.future_actions.map((action, i) => (
                                <motion.div
                                  key={i}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => sendQuery(action)}
                                    className="text-xs bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 rounded-full"
                                  >
                                    <ReactMarkdown
                                      components={{
                                        a: ({ node, ...props }) => (
                                          <a
                                            {...props}
                                            className="text-blue-600 font-semibold hover:underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          />
                                        ),
                                      }}
                                    >
                                      {action}
                                    </ReactMarkdown>
                                  </Button>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <Avatar className="h-8 w-8 mt-1 ring-2 ring-blue-100">
                      <AvatarImage src={userAvatar} alt="User" />
                      <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                        U
                      </AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* Gradient Overlays */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white to-transparent" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent" />
        </CardContent>

        {/* Input */}
        <div className="p-6 pt-0">
          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-200">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleSend()}
              className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-slate-500"
            />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                size="icon"
                className={`rounded-xl h-10 w-10 transition-all duration-200 ${
                  input.trim()
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                    : "bg-slate-300"
                }`}
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </motion.div>
          </div>

          <div className="flex justify-between mt-2 items-center">
            <p className="text-xs text-slate-500 text-center flex-1">
              Powered by Wings Tech AI • Press Enter to send
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default App;
