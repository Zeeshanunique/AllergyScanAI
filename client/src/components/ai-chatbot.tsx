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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch user profile for personalization
  const { data: profileData } = useQuery({
    queryKey: [`/api/users/${user?.id}`],
    enabled: isOpen && !!user?.id,
  });

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
      // Only add AI response since user message was already added optimistically
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        message,
        response: data.response,
        timestamp: new Date(),
        isUser: false,
        content: data.response
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Update chat history
      queryClient.invalidateQueries({ queryKey: ['/api/chat'] });
    },
    onError: (error) => {
      // Remove the optimistic user message on error
      setMessages(prev => prev.filter(msg => !msg.id.includes('optimistic')));
      console.error('Chat error:', error);
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create personalized welcome message
  const createWelcomeMessage = (profile: any) => {
    const firstName = profile?.firstName;
    const allergies = profile?.allergies || [];
    const medications = profile?.medications || [];
    
    let welcomeText = firstName 
      ? `Hi ${firstName}! I'm your personalized AI food safety assistant.` 
      : "Hi! I'm your AI food safety assistant.";
    
    if (allergies.length > 0 || medications.length > 0) {
      welcomeText += " I have your profile information including";
      if (allergies.length > 0) {
        welcomeText += ` your ${allergies.length} known allergen${allergies.length > 1 ? 's' : ''} (${allergies.slice(0, 2).join(', ')}${allergies.length > 2 ? ', etc.' : ''})`;
      }
      if (medications.length > 0) {
        if (allergies.length > 0) welcomeText += " and";
        welcomeText += ` your ${medications.length} current medication${medications.length > 1 ? 's' : ''}`;
      }
      welcomeText += ", so I can give you personalized advice.";
    } else {
      welcomeText += " I can help you understand allergens, medication interactions, and food safety guidelines.";
    }
    
    welcomeText += " What would you like to know?";
    return welcomeText;
  };

  useEffect(() => {
    if (profileData) {
      setUserProfile(profileData);
    }
  }, [profileData]);

  useEffect(() => {
    // Initialize messages with welcome message when component opens
    if (userProfile && messages.length === 0) {
      const welcomeMessage = createWelcomeMessage(userProfile);
      setMessages([{
        id: "welcome",
        message: "",
        response: welcomeMessage,
        timestamp: new Date(),
        isUser: false,
        content: welcomeMessage
      }]);
    }
  }, [userProfile]);

  useEffect(() => {
    // Load chat history only if we have history and no pending operations
    if (!sendMessageMutation.isPending && chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
      const welcomeMessage = createWelcomeMessage(userProfile);
      const formattedHistory: ChatMessage[] = [
        {
          id: "welcome",
          message: "",
          response: welcomeMessage,
          timestamp: new Date(),
          isUser: false,
          content: welcomeMessage
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
  }, [chatHistory, userProfile, sendMessageMutation.isPending]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || sendMessageMutation.isPending) return;
    
    const messageToSend = inputMessage.trim();
    
    // Optimistically add user message immediately
    const userMessage: ChatMessage = {
      id: `user-optimistic-${Date.now()}`,
      message: messageToSend,
      response: "",
      timestamp: new Date(),
      isUser: true,
      content: messageToSend
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    
    sendMessageMutation.mutate(messageToSend);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
  };

  // Generate personalized suggested questions
  const generateSuggestedQuestions = (profile: any) => {
    const allergies = profile?.allergies || [];
    const medications = profile?.medications || [];
    const firstName = profile?.firstName;
    
    const baseQuestions = [
      "What is cross-contamination and how can I avoid it?",
      "How should I read food labels for hidden allergens?",
      "What are common food-drug interactions?",
      "What should I do if I accidentally eat an allergen?",
    ];
    
    const personalizedQuestions = [];
    
    // Add allergy-specific questions
    if (allergies.length > 0) {
      const primaryAllergen = allergies[0];
      personalizedQuestions.push(`What foods should I avoid with my ${primaryAllergen} allergy?`);
      personalizedQuestions.push(`Are there hidden sources of ${primaryAllergen} I should know about?`);
      
      if (allergies.length > 1) {
        personalizedQuestions.push(`How can I manage multiple allergies like mine (${allergies.slice(0, 2).join(' and ')})?`);
      }
    }
    
    // Add medication-specific questions
    if (medications.length > 0) {
      personalizedQuestions.push(`What foods interact with my medications?`);
      if (medications.length === 1) {
        personalizedQuestions.push(`Are there any dietary restrictions while taking ${medications[0]}?`);
      }
    }
    
    // Add general personalized questions
    if (firstName) {
      personalizedQuestions.push(`What's the safest way for me to try new foods?`);
    }
    
    // Combine and limit to 6 questions
    const allQuestions = [...personalizedQuestions, ...baseQuestions];
    return allQuestions.slice(0, 6);
  };

  const suggestedQuestions = generateSuggestedQuestions(userProfile);

  const formatMessage = (content: string) => {
    // Split content by double line breaks to get sections
    const sections = content.split(/\n\s*\n/).filter(section => section.trim());
    
    return sections.map((section, sectionIndex) => {
      const trimmed = section.trim();
      if (trimmed.length === 0) return null;
      
      // Check for bold headings (markdown style **text**)
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        const headingText = trimmed.slice(2, -2);
        return (
          <h3 key={sectionIndex} className="font-semibold text-base mb-2 mt-4 first:mt-0 text-gray-900 dark:text-gray-100">
            {headingText}
          </h3>
        );
      }
      
      // Check for bullet points or lists
      if (trimmed.includes('• ') || trimmed.includes('- ')) {
        const lines = trimmed.split('\n').filter(line => line.trim());
        const listItems = lines.filter(line => line.trim().startsWith('• ') || line.trim().startsWith('- '));
        
        if (listItems.length > 0) {
          return (
            <div key={sectionIndex} className="mb-4">
              {listItems.map((item, itemIndex) => {
                const cleanItem = item.replace(/^[•-]\s*/, '').trim();
                return (
                  <div key={itemIndex} className="flex items-start mb-2">
                    <span className="text-primary mr-3 mt-1 flex-shrink-0">•</span>
                    <span className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{cleanItem}</span>
                  </div>
                );
              })}
            </div>
          );
        }
      }
      
      // Check for numbered lists
      if (trimmed.match(/^\d+\.\s/)) {
        const lines = trimmed.split('\n').filter(line => line.trim());
        const numberedItems = lines.filter(line => line.trim().match(/^\d+\.\s/));
        
        if (numberedItems.length > 0) {
          return (
            <div key={sectionIndex} className="mb-4">
              {numberedItems.map((item, itemIndex) => {
                const cleanItem = item.replace(/^\d+\.\s*/, '').trim();
                return (
                  <div key={itemIndex} className="flex items-start mb-2">
                    <span className="text-primary mr-3 mt-1 flex-shrink-0 font-medium">{itemIndex + 1}.</span>
                    <span className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{cleanItem}</span>
                  </div>
                );
              })}
            </div>
          );
        }
      }
      
      // Regular paragraphs
      return (
        <p key={sectionIndex} className="mb-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
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
              <h3 className="font-semibold">
                {userProfile?.firstName ? `AI Assistant for ${userProfile.firstName}` : 'AI Assistant'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {userProfile?.allergies?.length > 0 || userProfile?.medications?.length > 0
                  ? `Personalized for your ${userProfile.allergies?.length || 0} allergies & ${userProfile.medications?.length || 0} medications`
                  : 'Ask me about food safety'
                }
              </p>
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
          
          {/* Typing Indicator - Only show when actively sending */}
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
                placeholder={
                  userProfile?.allergies?.length > 0 
                    ? `Ask about ${userProfile.allergies[0]} safety, interactions, or anything else...`
                    : "Ask me anything about food safety, allergies, or nutrition..."
                }
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
            <span>
              {userProfile?.allergies?.length > 0 || userProfile?.medications?.length > 0
                ? "💡 I know your profile - ask me anything specific!"
                : "💡 Tip: Be specific about your allergies or dietary needs"
              }
            </span>
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
