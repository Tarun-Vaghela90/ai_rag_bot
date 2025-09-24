import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import wingstechlogo from "./assets/wingstech.png";
import userAvatar from "./assets/user.jpg";
import { v4 as uuidv4 } from "uuid";
import { BotIcon, ChevronLeft, SendHorizonalIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome to Wings Tech. What can we do for you?",
      future_actions: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  let userId = localStorage.getItem("chatUserId");
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem("chatUserId", userId);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuery = async (queryText) => {
    if (!queryText.trim()) return;

    const userMessage = { role: "user", content: queryText };
    const typingMessage = {
      role: "assistant",
      content: (
        <div className="flex flex-row gap-1 items-center justify-center py-1">
          <span className="w-3 h-3 rounded-full bg-gray-600 animate-bounce [animation-delay:0ms]" />
          <span className="w-3 h-3 rounded-full bg-gray-600 animate-bounce [animation-delay:200ms]" />
          <span className="w-3 h-3 rounded-full bg-gray-600 animate-bounce [animation-delay:400ms]" />
        </div>
        
      ),
      isTyping: true,
    };

    setMessages((prev) => [...prev, userMessage, typingMessage]);
    setInput("");

    try {
      const res = await axios.post("http://localhost:5000/rag/chat", {
        query: queryText,
        userId,
      });

      const botReply = res.data.answer || ["Sorry, I didn’t get that."];
      const futureActions = res.data.future_actions || [];

      setMessages((prev) =>
        prev.map((msg) =>
          msg.isTyping
            ? {
                role: "assistant",
                content: botReply,
                future_actions: futureActions,
              }
            : msg
        )
      );
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.isTyping
            ? { role: "assistant", content: "⚠️ Error connecting to server.", future_actions: [] }
            : msg
        )
      );
    }
  };

  const handleSend = () => sendQuery(input);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-100 p-2 sm:p-6">
      <div className="w-full max-w-lg h-full flex flex-col rounded-2xl gap-0 bg-white shadow-xl">
        {/* Header */}
        <div className="flex flex-row justify-start h-16 sm:h-18 p-2 sm:p-3 items-center gap-2 sm:gap-3 bg-blue-400 rounded-t-2xl">
          <ChevronLeft className="rounded-2xl bg-amber-50 p-1 size-6 sm:size-7 hover:transition-transform duration-300 hover:rotate-180" />
          <BotIcon className="text-white" height={32} width={32} />
          <p className="text-base sm:text-lg text-white">W Bot</p>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col gap-2 sm:gap-5 p-2 sm:p-5 overflow-y-auto scrollhide ">
          {messages.map((msg, idx) => (
            <div key={idx} className="mb-3">
              <div
                className={`flex gap-2 ${
                  msg.role === "user" ? "flex-col sm:flex-row-reverse" : "flex-col sm:flex-row"
                }`}
              >
                {/* Avatar */}
                <Avatar>
                  <AvatarImage src={msg.role === "assistant" ? wingstechlogo : userAvatar} alt={msg.role} />
                  <AvatarFallback>{msg.role === "assistant" ? "WT" : "U"}</AvatarFallback>
                </Avatar>

                {/* Message / typing dots */}
                {msg.isTyping ? (
                  <div className="flex flex-row gap-1 items-center justify-center py-1">
                    <span className="w-3 h-3 rounded-full bg-gray-600 animate-bounce [animation-delay:0ms]" />
                    <span className="w-3 h-3 rounded-full bg-gray-600 animate-bounce [animation-delay:200ms]" />
                    <span className="w-3 h-3 rounded-full bg-gray-600 animate-bounce [animation-delay:400ms]" />
                  </div>
                ) : (
                  <div
                    className={`px-3 py-2 rounded-2xl max-w-[85%] sm:max-w-md whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white shadow-md text-[16px] sm:text-[18px]"
                        : "bg-gray-200 border shadow-md text-gray-800 text-[16px] sm:text-[18px]"
                    }`}
                  >
                    {Array.isArray(msg.content)
                      ? msg.content.map((line, i) =>
                          line.startsWith("•") ? (
                            <li key={i} className="list-disc ml-5">
                              {line.slice(1).trim()}
                            </li>
                          ) : (
                            <p key={i}>{line}</p>
                          )
                        )
                      : msg.content}
                  </div>
                )}
              </div>

              {/* Future actions */}
              {msg.role === "assistant" && msg.future_actions?.length > 0 && (
                <div className="mt-1 sm:mt-2 flex gap-2 flex-wrap pl-0 sm:pl-10">
                  {msg.future_actions.map((action, i) => (
                    <Button key={i} size="sm" variant="outline" onClick={() => sendQuery(action)}>
                      {action}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 w-full p-2 sm:p-3">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 rounded-lg shadow-md text-sm sm:text-base"
          />
          <Button onClick={handleSend} className="shadow-md p-2 sm:px-4" disabled={loading}>
            {loading ? "..." : <SendHorizonalIcon className="size-5 sm:size-6" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default App;
