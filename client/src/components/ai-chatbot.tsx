import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  timestamp: Date;
  isUser: boolean;
  content: string;
}

export function AIChatbot({ isOpen, onClose, userId }: AIChatbotProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      message: "",
      response: "Hi! I'm your AI food safety assistant. I can help you understand allergens, medication interactions, and food safety guidelines. What would you like to know?",
      timestamp: new Date(),
      isUser: false,
      content: "Hi! I'm your AI food safety assistant. I can help you understand allergens, medication interactions, and food safety guidelines. What would you like to know?"
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: chatHistory } = useQuery({
    queryKey: ['/api/chat', userId],
    enabled: isOpen && !!userId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chat', {
        message,
        userId
      });
      return response.json();
    },
    onSuccess: (data, message) => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        message,
        response: data.response,
        timestamp: new Date(),
        isUser: false,
        content: data.response
      };
      
      setMessages(prev => [...prev, 
        {
          id: (Date.now() - 1).toString(),
          message,
          response: "",
          timestamp: new Date(),
          isUser: true,
          content: message
        },
        newMessage
      ]);
      
      queryClient.invalidateQueries({ queryKey: ['/api/chat', userId] });
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatHistory && Array.isArray(chatHistory)) {
      const formattedHistory: ChatMessage[] = [
        {
          id: "welcome",
          message: "",
          response: "Hi! I'm your AI food safety assistant. I can help you understand allergens, medication interactions, and food safety guidelines. What would you like to know?",
          timestamp: new Date(),
          isUser: false,
          content: "Hi! I'm your AI food safety assistant. I can help you understand allergens, medication interactions, and food safety guidelines. What would you like to know?"
        }
      ];
      
      chatHistory.forEach((chat: any) => {
        formattedHistory.push(
          {
            id: `${chat.id}-user`,
            message: chat.message,
            response: "",
            timestamp: new Date(chat.timestamp),
            isUser: true,
            content: chat.message
          },
          {
            id: `${chat.id}-ai`,
            message: chat.message,
            response: chat.response,
            timestamp: new Date(chat.timestamp),
            isUser: false,
            content: chat.response
          }
        );
      });
      
      setMessages(formattedHistory);
    }
  }, [chatHistory]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(inputMessage.trim());
    setInputMessage("");
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
  };

  const suggestedQuestions = [
    "What is cross-contamination and how can I avoid it?",
    "How should I read food labels for hidden allergens?",
    "What are common food-drug interactions?",
    "How do I know if a food is safe for my allergies?"
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50" data-testid="ai-chatbot-modal">
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-xl h-[70vh] flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <i className="fas fa-robot text-primary-foreground text-sm"></i>
            </div>
            <div>
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">Ask me about food safety</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1"
            data-testid="button-close-chatbot"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'items-start space-x-3'}`}>
              {!message.isUser && (
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-robot text-primary-foreground text-xs"></i>
                </div>
              )}
              <div 
                className={`rounded-lg p-3 max-w-[80%] ${
                  message.isUser 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : 'bg-secondary/50'
                }`}
                data-testid={message.isUser ? "chat-message-user" : "chat-message-ai"}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}
          
          {sendMessageMutation.isPending && (
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-robot text-primary-foreground text-xs"></i>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Suggested Questions */}
          {messages.length <= 1 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Suggested questions:</p>
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="bg-muted text-muted-foreground px-3 py-2 rounded-lg text-sm text-left w-full hover:bg-secondary/50 transition-colors"
                  data-testid={`suggested-question-${index}`}
                >
                  {question}
                </button>
              ))}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Chat Input */}
        <div className="border-t border-border p-4">
          <div className="flex items-center space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about food safety..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={sendMessageMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AIChatbotButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-105 transition-transform"
      data-testid="button-open-chatbot"
    >
      <i className="fas fa-robot text-xl"></i>
    </button>
  );
}
