"use client";

import React from "react";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Send, Bot, User, Loader2 } from "lucide-react";
import type { Profile } from "@/lib/types";

interface OnboardingChatProps {
  profile: Profile;
  onComplete: () => void;
  onSkip: () => void;
}

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
}

const INITIAL_MESSAGE = `Hola! Soy tu asistente de G10 Flow. Antes de comenzar, me gustaria conocerte mejor para personalizar tu experiencia de entrenamiento.

Contame un poco sobre vos:
- Cual es tu objetivo principal? (perder peso, ganar musculo, mejorar resistencia, etc.)
- Tenes experiencia previa en el gimnasio?
- Hay algun ejercicio o actividad que te guste especialmente?`;

export function OnboardingChat({
  profile,
  onComplete,
  onSkip,
}: OnboardingChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Here you would call your microservice API
    // For now, we simulate a response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Gracias por compartir eso conmigo! Esta informacion nos ayudara a personalizar tu plan de entrenamiento. Tu entrenador podra ver estas respuestas y crear una rutina adaptada a tus necesidades.\n\nHay algo mas que quieras contarme sobre tus habitos, lesiones previas, o disponibilidad horaria?",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleComplete = async () => {
    // Save onboarding as completed
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", profile.id);

    onComplete();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold">Bienvenido a G10 Flow</h1>
            <p className="text-xs text-muted-foreground">
              Contanos sobre vos para personalizar tu experiencia
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSkip}
          className="text-muted-foreground"
        >
          <X className="w-5 h-5" />
        </Button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <Card
              className={`max-w-[80%] p-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border-border/50"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </Card>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <Card className="bg-card border-border/50 p-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/50 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Escribe tu mensaje..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-background/50"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={onSkip}
          >
            Omitir por ahora
          </Button>
          <Button className="flex-1" onClick={handleComplete}>
            Finalizar y continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
