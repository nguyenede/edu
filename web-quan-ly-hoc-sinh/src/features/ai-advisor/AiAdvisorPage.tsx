import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {
  Send,
  User as UserIcon,
  Bot,
  MessageSquare
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface StudentMetrics {
  id: number;
  full_name: string;
  gpa: number | null;
  attendance_rate: number;
  unpaid_amount: number;
}

const AiAdvisorPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<StudentMetrics | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize with a welcoming message
  useEffect(() => {
    const welcome = user?.role === 'parent'
      ? `Xin chào phụ huynh **${user.full_name}**! Tôi là **AI Advisor** - Trợ lý Học thuật chuyên sâu dành riêng cho gia đình.\n\nTôi có thể kết nối thời gian thực với kết quả điểm số, chuyên cần và học phí của con em anh/chị. Anh/chị có thể click nhanh các gợi ý bên dưới hoặc đặt câu hỏi bất kỳ như:\n* "Con tôi học lực thế nào?"\n* "Có hóa đơn học phí nào chưa đóng không?"\n* "Xem lịch học hôm nay của con."`
      : `Xin chào **${user?.full_name}**! Tôi là **AI Advisor** - Trợ lý Học thuật cá nhân của bạn.\n\nTôi có thể giúp bạn kiểm tra nhanh tình hình GPA học thuật, tỉ lệ chuyên cần đi học, hóa đơn học phí còn nợ hoặc thời khóa biểu hôm nay. Bạn có thể sử dụng các nút bấm phím tắt bên dưới để trò chuyện cùng tôi nhé!`;

    setMessages([
      {
        sender: 'ai',
        text: welcome,
        timestamp: new Date()
      }
    ]);

    // Fetch initial metrics by sending a general helper request to trigger student profile load
    const fetchInitialMetrics = async () => {
      try {
        const res = await api.post('/reports/ai-advisor/chat', { message: 'hello' });
        if (res.data.success && res.data.data.analyzedStudent) {
          setMetrics(res.data.data.analyzedStudent);
        }
      } catch (error) {
        console.error('Failed to load advisor metrics:', error);
      }
    };
    fetchInitialMetrics();
  }, [user]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    // Add user message
    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    try {
      const res = await api.post('/reports/ai-advisor/chat', { message: textToSend });
      
      if (res.data.success) {
        const aiMsg: Message = {
          sender: 'ai',
          text: res.data.data.reply,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
        
        // Update metrics if returned
        if (res.data.data.analyzedStudent) {
          setMetrics(res.data.data.analyzedStudent);
        }
      } else {
        throw new Error(res.data.message);
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: `Rất tiếc, tôi gặp sự cố kết nối dữ liệu. Vui lòng thử lại câu hỏi sau ít phút. Lỗi: ${error.response?.data?.message || error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: 'Phân tích học lực (GPA)', text: 'Phân tích học lực điểm số của con' },
    { label: 'Tỉ lệ đi học (Chuyên cần)', text: 'Tình hình đi học chuyên cần thế nào' },
    { label: 'Học phí & Hóa đơn', text: 'Học phí nợ bao nhiêu' },
    { label: 'Thời khóa biểu hôm nay', text: 'Lịch học thời khóa biểu hôm nay' },
    { label: 'Phương pháp cải thiện điểm', text: 'Làm sao để cải thiện điểm số tốt hơn' }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Main Container */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Chat Panel */}
        <div className="flex-1 bg-white border border-[#EDEDF2] rounded-3xl flex flex-col min-h-0 overflow-hidden shadow-sm">
          {/* Chat Headers */}
          <div className="h-14 px-6 border-b border-[#EDEDF2] flex items-center gap-2.5 shrink-0 bg-[#F5F5F7]/30">
            <Bot className="w-5 h-5 text-[#0071E3]" />
            <span className="font-semibold text-sm text-[#1D1D1F]">AI Learning Advisor</span>
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-0.5 bg-[#34C759]/10 text-[#34C759] rounded-full text-[10px] font-bold uppercase tracking-wider">
              Online
            </div>
            {metrics && <span className="hidden md:inline text-[11px] text-[#6E6E73]">GPA {metrics.gpa ?? 'N/A'} • Chuyên cần {metrics.attendance_rate}%</span>}
          </div>

          {/* Messages Flow Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white ${
                  msg.sender === 'user' ? 'bg-[#0071E3]' : 'bg-[#1D1D1F]'
                }`}>
                  {msg.sender === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className="space-y-1">
                  <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                    msg.sender === 'user' 
                      ? 'bg-[#0071E3] text-white rounded-tr-none' 
                      : 'bg-[#F5F5F7] text-[#1D1D1F] rounded-tl-none border border-[#EDEDF2]'
                  }`}>
                    {msg.text.split('\n').map((line, i) => {
                      // Simple markdown parsing for bold text
                      const boldRegex = /\*\*(.*?)\*\*/g;
                      const inlineCodeRegex = /`(.*?)`/g;
                      
                      const parts = line.split(boldRegex);
                      return (
                        <p key={i} className={i > 0 ? 'mt-2' : ''}>
                          {parts.map((part, k) => {
                            if (k % 2 === 1) return <strong key={k} className="font-bold">{part}</strong>;
                            
                            // Parse inline code
                            const subparts = part.split(inlineCodeRegex);
                            return subparts.map((sub, s) => {
                              if (s % 2 === 1) return <code key={s} className="px-1.5 py-0.5 bg-black/10 text-xs rounded font-mono mx-0.5">{sub}</code>;
                              return sub;
                            });
                          })}
                        </p>
                      );
                    })}
                  </div>
                  <p className={`text-[10px] text-[#6E6E73] ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 max-w-[85%] mr-auto">
                <div className="w-8 h-8 rounded-full bg-[#1D1D1F] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-[#F5F5F7] text-[#6E6E73] p-4 rounded-2xl rounded-tl-none border border-[#EDEDF2] shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[#6E6E73] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-[#6E6E73] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-[#6E6E73] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-xs font-semibold">AI đang phân tích dữ liệu...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick-Prompt Buttons */}
          <div className="px-6 py-3 border-t border-[#EDEDF2] flex gap-2 overflow-x-auto shrink-0 bg-[#F5F5F7]/10">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p.text)}
                disabled={isLoading}
                className="h-8 px-3.5 bg-white border border-[#D5D5D7] hover:border-[#0071E3] hover:text-[#0071E3] text-[#333336] rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {p.label}
              </button>
            ))}
          </div>

          {/* Send Input Area */}
          <div className="p-4 border-t border-[#EDEDF2] shrink-0 bg-white">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputVal);
              }}
              className="flex gap-3 items-center"
            >
              <div className="flex-1">
                <Input
                  label="Gõ câu hỏi về điểm số, học lực, học phí, lịch học..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  disabled={isLoading}
                  className="w-full pr-10"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isLoading || !inputVal.trim()}
                className="w-11 h-11 p-0 rounded-full shrink-0 flex items-center justify-center bg-[#0071E3] hover:bg-[#006EDB]"
              >
                <Send className="w-4 h-4 text-white" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAdvisorPage;
