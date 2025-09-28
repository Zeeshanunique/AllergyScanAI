import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  timestamp: Date;
  isUser: boolean;
  content: string;
}

export function AIChatbot({ isOpen, onClose }: AIChatbotProps) {
  const { user } = useAuth();
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
    queryKey: ['/api/chat'],
    enabled: isOpen && !!user,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chat', {
        message,
      });
      if (!response) {
        throw new Error('Failed to send message');
      }
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
      
      queryClient.invalidateQueries({ queryKey: ['/api/chat'] });
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
    "How do I know if a food is safe for my allergies?",
    "What should I do if I accidentally eat an allergen?",
    "How can I cook safely with multiple food allergies?"
  ];

  const formatMessage = (content: string) => {
    // Format long AI responses with better structure
    const paragraphs = content.split(/\n\n|\. (?=[A-Z])/);
    
    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (trimmed.length === 0) return null;
      
      // Check for bullet points or lists
      if (trimmed.includes('- ') || trimmed.includes('• ')) {
        const items = trimmed.split(/\n?[-•]\s+/).filter(item => item.trim());
        return (
          <div key={index} className="mb-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-start mb-1">
                <span className="text-primary mr-2 mt-1">•</span>
                <span className="text-sm leading-relaxed">{item.trim()}</span>
              </div>
            ))}
          </div>
        );
      }
      
      // Regular paragraphs
      return (
        <p key={index} className="mb-3 text-sm leading-relaxed">
          {trimmed}
        </p>
      );
    }).filter(Boolean);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'items-start space-x-3'}`}>
              {/* AI Avatar */}
              {!message.isUser && (
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot size={16} className="text-primary-foreground" />
                </div>
              )}
              
              {/* Message Content */}
              <div className={`group max-w-[85%] ${message.isUser ? 'ml-auto' : ''}`}>
                {/* Message Bubble */}
                <div 
                  className={`rounded-2xl p-4 shadow-sm ${
                    message.isUser 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-white border border-border'
                  }`}
                  data-testid={message.isUser ? "chat-message-user" : "chat-message-ai"}
                >
                  {message.isUser ? (
                    <p className="text-sm font-medium">{message.content}</p>
                  ) : (
                    <div className="text-sm text-foreground space-y-2">
                      {formatMessage(message.content)}
                    </div>
                  )}
                </div>
                
                {/* Message Actions */}
                {!message.isUser && (
                  <div className="flex items-center mt-2 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-secondary/50"
                      onClick={() => copyToClipboard(message.content)}
                      title="Copy message"
                    >
                      <Copy size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-secondary/50 text-green-600"
                      title="Helpful"
                    >
                      <ThumbsUp size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-secondary/50 text-red-600"
                      title="Not helpful"
                    >
                      <ThumbsDown size={12} />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* User Avatar */}
              {message.isUser && (
                <div className="w-8 h-8 bg-gradient-to-br from-secondary to-secondary/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User size={16} className="text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {/* Typing Indicator */}
          {sendMessageMutation.isPending && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot size={16} className="text-primary-foreground" />
              </div>
              <div className="bg-white border border-border rounded-2xl p-4 shadow-sm">
                <div className="flex space-x-1 items-center">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Suggested Questions */}
          {messages.length <= 1 && (
            <div className="space-y-3 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-1 h-4 bg-primary rounded-full"></div>
                <p className="text-sm font-medium text-foreground">Quick questions to get started:</p>
              </div>
              <div className="grid gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border border-primary/20 text-foreground px-4 py-3 rounded-xl text-sm text-left transition-all duration-200 hover:shadow-sm hover:scale-[1.02]"
                    data-testid={`suggested-question-${index}`}
                  >
                    <span className="text-primary mr-2">→</span>
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Chat Input */}
        <div className="border-t border-border bg-white/80 backdrop-blur-sm p-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask me anything about food safety, allergies, or nutrition..."
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={sendMessageMutation.isPending}
                data-testid="input-chat-message"
                className="min-h-[44px] rounded-xl border-border/50 focus:border-primary/50 focus:ring-primary/20 pr-16"
              />
              {inputMessage.trim() && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="text-xs text-muted-foreground">
                    {inputMessage.length}/500
                  </div>
                </div>
              )}
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
              className="h-11 w-11 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              size="sm"
            >
              <Send size={18} />
            </Button>
          </div>
          
          {/* Input Helper Text */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>💡 Tip: Be specific about your allergies or dietary needs</span>
            <span>Usually responds in seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AIChatbotButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="fixed bottom-24 right-4 z-40">
      <button 
        onClick={onClick}
        className="group relative w-16 h-16 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full shadow-lg hover:shadow-xl flex items-center justify-center hover:scale-110 transition-all duration-300 animate-pulse hover:animate-none"
        data-testid="button-open-chatbot"
      >
        <Bot size={24} className="group-hover:scale-110 transition-transform duration-200" />
        
        {/* Notification Badge */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce">
          !
        </div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-black text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          Ask AI Assistant
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
        </div>
      </button>
    </div>
  );
}
