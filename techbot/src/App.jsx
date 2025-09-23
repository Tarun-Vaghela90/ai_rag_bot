import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import wingstechlogo from "./assets/wingstech.png";
import { v4 as uuidv4 } from "uuid";
import { Paperclip, PlusIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
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

    const newMessage = { role: "user", content: queryText };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/rag/chat", {
        query: queryText,
        userId: userId,
      });

      const botReply = res.data.answer || ["Sorry, I didn’t get that."];
      const futureActions = res.data.future_actions || [];

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: botReply,
          future_actions: futureActions,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Error connecting to server.",
          future_actions: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendQuery(input);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-100 p-6">
      <Card className="w-full max-w-lg h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex flex-row justify-center items-center gap-3">
            <img
              src={wingstechlogo}
              height={30}
              width={30}
              alt="wingstechlogo"
            />
            Wings Tech Solutions
          </CardTitle>
        </CardHeader>
        <CardContent className="h-36 flex flex-col flex-1 gap-5">
          <ScrollArea className="h-16 flex-1 p-2 rounded-md border break-words">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-2 ${
                  msg.role === "user" ? "text-right" : "text-left"
                }`}
              >
                {Array.isArray(msg.content) ? (
                  <ol className="list-none pl-5 border p-2 rounded-2xl bg-gray-100">
                    {msg.content.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ol>
                ) : (
                  <span
                    className={`inline-block px-3 py-2 rounded-lg whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {msg.content}
                  </span>
                )}

                {/* Render future actions if available */}
                {msg.future_actions && msg.future_actions.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {msg.future_actions.map((action, idx) => (
                      <Button
                        key={idx}
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
            <ScrollBar orientation="vertical" />
          </ScrollArea>

          <div className="flex flex-col gap-2 w-full">
  {/* File preview */}
  {/* {file && (
    <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md border">
      {file.type.startsWith("image/") ? (
        <img
          src={URL.createObjectURL(file)}
          alt="preview"
          className="w-10 h-10 object-cover rounded"
        />
      ) : (
        <div className="flex items-center gap-1 text-gray-700">
          📎 <span className="truncate max-w-xs">{file.name}</span>
        </div>
      )}
      <button
        type="button"
        className="ml-auto text-red-500 hover:text-red-700"
        onClick={() => setFile(null)}
      >
        ✕
      </button>
    </div>
  )} */}

  {/* Input + file upload icon */}
  <div className="flex items-center gap-2 w-full">
    <Input
      placeholder="Type your message..."
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && handleSend()}
      className="flex-1"
    />

    {/* File icon trigger */}
    {/* <Label htmlFor="file-upload" className="cursor-pointer rounded">
      <Paperclip className="w-6 h-6 hover:text-gray-700" />
    </Label> */}

    {/* Hidden file input */}
    {/* <Input
      id="file-upload"
      type="file"
      className="hidden"
      onChange={(e) => setFile(e.target.files[0])}
    /> */}

    <Button onClick={handleSend} disabled={loading}>
      {loading ? "..." : "Send"}
    </Button>
  </div>
</div>

        </CardContent>
      </Card>
    </div>
  );
}

export default App;
