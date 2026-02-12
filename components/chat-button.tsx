"use client";

import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

interface ChatButtonProps {
  profile: Profile;
}

export function ChatButton({ profile }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content: `Hola ${profile.full_name}! Soy tu asistente de entrenamiento. Puedo ayudarte a analizar tu progreso, responder dudas sobre tus rutinas y darte recomendaciones personalizadas. Como puedo ayudarte hoy?`,
    },
  ]);

  const handleSend = () => {
    if (!message.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setMessage("");

    // Simulated response - In production, connect to your AI agent
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Gracias por tu mensaje! En este momento estoy procesando tu consulta. Pronto podre darte informacion detallada sobre tu entrenamiento y progreso.",
        },
      ]);
    }, 1000);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed right-4 bottom-20 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95",
          isOpen && "hidden"
        )}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat window - fullscreen on mobile */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-background flex flex-col transition-transform duration-300",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-border/50 bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Asistente IA</h2>
              <p className="text-xs text-muted-foreground">Tu entrenador virtual</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "max-w-[85%] rounded-2xl p-4",
                msg.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border/50 rounded-bl-sm"
              )}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-card safe-area-bottom">
          <div className="flex items-center gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 bg-background/50"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
