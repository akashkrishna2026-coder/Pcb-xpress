import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const Preloader = ({ active }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(active);
  const timerRef = useRef();

  useEffect(() => {
    if (active) {
      setVisible(true);
      // Start progressing up to 90% while active
      timerRef.current = setInterval(() => {
        setProgress((p) => clamp(p + Math.random() * 6 + 2, 0, 90));
      }, 150);
      return () => clearInterval(timerRef.current);
    } else {
      // Complete to 100 then fade out
      clearInterval(timerRef.current);
      setProgress(100);
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }
  }, [active]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[1000] bg-background/95 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-[min(420px,90vw)]">
            <div className="flex items-center justify-center mb-4 gap-3">
              <Logo size={40} showText={false} />
              <p className="text-sm text-muted-foreground">Loading experience…</p>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-2 bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.15 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Preloader;
