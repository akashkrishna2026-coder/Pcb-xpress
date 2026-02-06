import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'px_chat_messages';

const Chatbot = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr) && arr.length) return arr;
    } catch {}
    return [
      { role: 'bot', text: 'Hi! I\'m here to help. Ask about quotes, components, 3D printing, or services.' , ts: Date.now() }
    ];
  });
  const [typing, setTyping] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100))); } catch {}
  }, [messages]);

  useEffect(() => {
    if (open) {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [open, messages, typing]);

  const quick = useMemo(() => [
    { label: 'Get a quote', value: 'quote' },
    { label: 'Components sourcing', value: 'components' },
    { label: '3D printing', value: '3d printing' },
    { label: 'Capabilities', value: 'capabilities' },
  ], []);

  const routeFor = (q) => {
    const ql = q.toLowerCase();
    const isMpnLike = /[a-z]{2,}\d|\d{2,}[a-z]/i.test(q);
    if (ql.includes('component') || ql.includes('bom') || isMpnLike) {
      return `/components?q=${encodeURIComponent(q)}`;
    }
    if (ql.includes('quote') || ql.includes('gerber')) return '/quote';
    if (ql.includes('3d') || ql.includes('print')) return '/3d-printing';
    if (ql.includes('capab')) return '/capabilities';
    if (ql.includes('service')) return '/services';
    if (ql.includes('login') && ql.includes('admin')) return '/pcbXpress/login';
    return null;
  };

  const reply = async (q) => {
    const dest = routeFor(q);
    setTyping(true);
    await new Promise((r) => setTimeout(r, 500));
    const responses = [];
    if (dest) {
      if (dest.startsWith('/components')) {
        responses.push('I\'ll take you to Components. I\'ve prefilled your search.');
      } else if (dest === '/quote') {
        responses.push('Sure — opening the Get Quote flow.');
      } else if (dest === '/3d-printing') {
        responses.push('Let\'s explore 3D printing options.');
      } else if (dest === '/capabilities') {
        responses.push('Here are our capabilities.');
      } else if (dest === '/services') {
        responses.push('Here are all our services.');
      } else if (dest === '/pcbXpress/login') {
        responses.push('Redirecting to the admin login.');
      }
      setMessages((m) => [...m, { role: 'bot', text: responses.join(' '), ts: Date.now() }]);
      setTyping(false);
      navigate(dest);
      return;
    }
    // Fallback helpful response
    responses.push('I can help you with quotes, components sourcing, 3D printing, or general services.');
    responses.push('Try asking: "components for ESP32", "get quote", or "3D printing".');
    setMessages((m) => [...m, { role: 'bot', text: responses.join(' '), ts: Date.now() }]);
    setTyping(false);
  };

  const onSend = async (text) => {
    const q = (text ?? input).trim();
    if (!q) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q, ts: Date.now() }]);
    reply(q);
  };

  return (
    <>
      {/* Toggle button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5, type: 'spring' }}
      >
        <Button
          size="icon"
          className="rounded-full h-14 w-14 bg-primary hover:bg-primary/90 shadow-lg"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close chat' : 'Open chat'}
        >
          <MessageSquare className="h-7 w-7" />
        </Button>
      </motion.div>

      {/* Chat window */}
      {open && (
        <motion.div
          className="fixed bottom-24 right-6 z-50 w-[92vw] max-w-sm rounded-xl border bg-background text-foreground shadow-2xl overflow-hidden"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="border-b px-4 py-3 flex items-center justify-between bg-secondary/40">
            <div>
              <p className="font-semibold leading-tight">pcbXpress</p>
              <p className="text-xs text-muted-foreground">Ask about quotes, components, or services</p>
            </div>
            <button className="p-1.5 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)} aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={listRef} className="h-72 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground">
                  typing…
                </div>
              </div>
            )}
          </div>

          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-2 mb-2">
              {quick.map((q) => (
                <Button key={q.value} size="sm" variant="outline" onClick={() => onSend(q.value)}>
                  {q.label}
                </Button>
              ))}
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); onSend(); }}
            >
              <Input
                placeholder="Type your question…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <Button type="submit" disabled={!input.trim()} className="gap-1">
                <Send className="w-4 h-4" />
                Send
              </Button>
            </form>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default Chatbot;
