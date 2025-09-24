import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import wingstechlogo from "./assets/wingstech.png";
import userAvatar from "./assets/user.jpg";
import { v4 as uuidv4 } from "uuid";
import { BotIcon, ChevronLeft, Paperclip, PlusIcon, SendHorizonalIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
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
  const [file, setFile] = useState("");
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

    // Add user message
    const userMessage = { role: "user", content: queryText };
    // Add temporary typing message
    const typingMessage = {
      role: "assistant",
      content: "...",
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

      // Replace typing message with actual reply
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
            ? {
                role: "assistant",
                content: "⚠️ Error connecting to server.",
                future_actions: [],
              }
            : msg
        )
      );
    }
  };

  const handleSend = () => sendQuery(input);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-lg h-full flex flex-col rounded-2xl gap-0 bg-white shadow-xl ">
        <div>
          {/* header */}
          <div className="flex flex-row justify-start h-18 p-2   items-center  gap-3 bg-blue-400  rounded-t-2xl ">
            <ChevronLeft className=" rounded-2xl bg-amber-50    p-1 size-7 hover:transition-transform duration-300 hover:rotate-180" />
            {/* <img
              src={wingstechlogo}
              height={50}
              width={50}
              alt="wingstechlogo"
            /> */}

              <BotIcon className="text-white"  height={40} width={40} />
            <p className="text-lg text-white"> W Bot</p>
          </div>
        </div>
        <div className="h-36 flex   flex-col flex-1 gap-5 p-5">
          <div className="h-16 flex-1  break-words   scrollhide overflow-x-auto ">
            {messages.map((msg, idx) => (
              <div key={idx} className="mb-4 ">
                <div
                  className={`flex items-start gap-2 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <Avatar>
                    <AvatarImage
                      src={
                        msg.role === "assistant" ? wingstechlogo : userAvatar
                      }
                      alt={msg.role}
                    />
                    <AvatarFallback>
                      {msg.role === "assistant" ? "WT" : "U"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Bubble */}
                  <div
                    className={`px-3 py-3 rounded-2xl  max-w-xs whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white shadow-md  text-[18px]"
                        : "bg-gray-200 border shadow-md text-gray-800 text-[18px]"
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
                </div>

                {/* Future actions */}
                {msg.role === "assistant" && msg.future_actions?.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap pl-10">
                    {msg.future_actions.map((action, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant="outline"
                        onClick={() => sendQuery(action)}
                      >
                        {action}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div ref={bottomRef} />
          </div>
          

          <div className="flex flex-col gap-2 w-full">
            {/* Input + file upload icon */}
            <div className="flex items-center gap-2 w-full">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 rounded-lg shadow-md"
              />

              <Button onClick={handleSend} className="shadow-md" disabled={loading}>
                {loading ? "..." : <SendHorizonalIcon/> }
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
