import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Bot, Phone, Mail, HelpCircle, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  message: string;
  timestamp: Date;
  options?: ChatOption[];
}

interface ChatOption {
  id: string;
  text: string;
  action: string;
}

export function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick action options
  const quickActions = [
    { id: 'track-order', text: 'Track My Order', action: 'track_order' },
    { id: 'booking-help', text: 'Booking Help', action: 'booking_help' },
    { id: 'payment-issue', text: 'Payment Issues', action: 'payment_issue' },
    { id: 'contact-support', text: 'Contact Support', action: 'contact_support' },
  ];

  // Predefined responses
  const botResponses: Record<string, { message: string; options?: ChatOption[] }> = {
    welcome: {
      message: "Hi there! 👋 I'm here to help you with your costume rental needs. What can I assist you with today?",
      options: quickActions
    },
    track_order: {
      message: "I can help you track your order! Please provide your order number (e.g., CR-2024-001) and I'll get the latest status for you.",
    },
    booking_help: {
      message: "I'd be happy to help with your booking! Here are some common topics:",
      options: [
        { id: 'modify-booking', text: 'Modify Booking Dates', action: 'modify_booking' },
        { id: 'cancel-booking', text: 'Cancel Booking', action: 'cancel_booking' },
        { id: 'booking-policy', text: 'Booking Policies', action: 'booking_policy' },
        { id: 'size-guide', text: 'Size Guide', action: 'size_guide' },
      ]
    },
    payment_issue: {
      message: "I can help resolve payment issues. What specific problem are you experiencing?",
      options: [
        { id: 'payment-failed', text: 'Payment Failed', action: 'payment_failed' },
        { id: 'refund-status', text: 'Refund Status', action: 'refund_status' },
        { id: 'payment-methods', text: 'Payment Methods', action: 'payment_methods' },
        { id: 'billing-questions', text: 'Billing Questions', action: 'billing_questions' },
      ]
    },
    contact_support: {
      message: "Here are the ways to reach our support team:",
      options: [
        { id: 'phone-support', text: '📞 Call: +91 98765 43210', action: 'phone_call' },
        { id: 'email-support', text: '✉️ Email: support@costumerent.com', action: 'send_email' },
        { id: 'live-chat', text: '💬 Live Agent Chat', action: 'live_chat' },
        { id: 'whatsapp', text: '📱 WhatsApp Support', action: 'whatsapp' },
      ]
    },
    modify_booking: {
      message: "To modify your booking dates, please visit your Dashboard > Booking Management section. You can change dates up to 24 hours before your rental starts.",
    },
    cancel_booking: {
      message: "You can cancel your booking from the Dashboard > Booking Management section. Refund policies:\n\n• 7+ days before: 100% refund\n• 3-6 days before: 50% refund\n• 1-2 days before: 25% refund",
    },
    size_guide: {
      message: "Our size guide is available on each product page. For custom fittings, we offer:\n\n• In-store measurements\n• Video consultation\n• Size exchange within 24 hours of delivery",
    },
    default: {
      message: "I understand you need help with that. Let me connect you with a human agent who can better assist you.",
      options: [
        { id: 'human-agent', text: 'Connect to Human Agent', action: 'live_chat' },
        { id: 'back-menu', text: 'Back to Main Menu', action: 'main_menu' },
      ]
    }
  };

  useEffect(() => {
    if (messages.length === 0 && isOpen) {
      // Welcome message when chat is first opened
      setTimeout(() => {
        addBotMessage('welcome');
      }, 500);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addBotMessage = (responseKey: string) => {
    setIsTyping(true);
    
    setTimeout(() => {
      const response = botResponses[responseKey] || botResponses.default;
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        message: response.message,
        timestamp: new Date(),
        options: response.options,
      };
      
      setMessages(prev => [...prev, newMessage]);
      setIsTyping(false);
      
      if (!isOpen) {
        setHasNewMessage(true);
      }
    }, 800);
  };

  const addUserMessage = (message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    addUserMessage(inputMessage);
    setInputMessage('');
    
    // Simple keyword matching for demo - replace with actual AI/NLP
    const message = inputMessage.toLowerCase();
    if (message.includes('order') || message.includes('track')) {
      addBotMessage('track_order');
    } else if (message.includes('payment') || message.includes('refund')) {
      addBotMessage('payment_issue');
    } else if (message.includes('booking') || message.includes('cancel') || message.includes('modify')) {
      addBotMessage('booking_help');
    } else if (message.includes('contact') || message.includes('support') || message.includes('help')) {
      addBotMessage('contact_support');
    } else {
      addBotMessage('default');
    }
  };

  const handleOptionClick = (action: string) => {
    if (action === 'main_menu') {
      addBotMessage('welcome');
    } else if (action === 'phone_call') {
      window.open('tel:+919876543210');
    } else if (action === 'send_email') {
      window.open('mailto:support@costumerent.com');
    } else if (action === 'live_chat') {
      addBotMessage('default');
    } else if (action === 'whatsapp') {
      window.open('https://wa.me/919876543210');
    } else if (botResponses[action]) {
      addBotMessage(action);
    } else {
      addBotMessage('default');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setHasNewMessage(false);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className={cn(
          "bg-white rounded-lg shadow-2xl border border-gray-200 mb-4 transition-all duration-300",
          isMinimized ? "w-80 h-16" : "w-80 h-96 md:w-96 md:h-[500px]"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-brand-purple to-brand-emerald text-white rounded-t-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Support Assistant</h3>
                <p className="text-xs opacity-90">Online • Typically replies in minutes</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
              >
                <ChevronDown className={cn("h-3 w-3 transition-transform", isMinimized && "rotate-180")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleChat}
                className="p-1 h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <ScrollArea className="h-80 md:h-96 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.type === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-start space-x-2 max-w-xs",
                          message.type === 'user' ? "flex-row-reverse space-x-reverse" : ""
                        )}
                      >
                        {/* Avatar */}
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                          message.type === 'user' 
                            ? "bg-brand-purple text-white" 
                            : "bg-gray-100 text-gray-600"
                        )}>
                          {message.type === 'user' ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={cn(
                            "px-3 py-2 rounded-lg text-sm",
                            message.type === 'user'
                              ? "bg-brand-purple text-white rounded-br-none"
                              : "bg-gray-100 text-gray-800 rounded-bl-none"
                          )}
                        >
                          <p className="whitespace-pre-wrap">{message.message}</p>
                          <p className={cn(
                            "text-xs mt-1 opacity-70",
                            message.type === 'user' ? "text-white" : "text-gray-500"
                          )}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Quick Action Options */}
                  {messages.length > 0 && messages[messages.length - 1]?.options && (
                    <div className="space-y-2">
                      {messages[messages.length - 1].options!.map((option) => (
                        <Button
                          key={option.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleOptionClick(option.action)}
                          className="w-full text-left justify-start text-sm h-auto py-2 px-3 border-brand-purple/20 hover:bg-brand-purple/5 hover:border-brand-purple/40"
                        >
                          {option.text}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <Bot className="h-3 w-3 text-gray-600" />
                        </div>
                        <div className="bg-gray-100 px-3 py-2 rounded-lg rounded-bl-none">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 text-sm"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    size="sm"
                    className="px-3 bg-brand-purple hover:bg-brand-purple-dark"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Powered by CostumeRent Support
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat Toggle Button */}
      <Button
        onClick={toggleChat}
        className="h-14 w-14 rounded-full bg-gradient-to-r from-brand-purple to-brand-emerald hover:from-brand-purple-dark hover:to-brand-emerald-dark shadow-lg hover:shadow-xl transition-all duration-300 group"
      >
        <div className="relative">
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <MessageCircle className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
          )}
          
          {hasNewMessage && !isOpen && (
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </Button>
    </div>
  );
}

export default SupportChatbot;
