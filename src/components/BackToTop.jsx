import React, { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setVisible(y > 200);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      title="Back to top"
      className="fixed bottom-6 right-6 z-[9999] bg-black text-white border border-white/10 hover:bg-white/90 hover:text-black transition-colors rounded-full w-11 h-11 flex items-center justify-center shadow-lg"
      aria-label="Back to top"
    >
      <ChevronUp size={20} />
    </button>
  );
};

export default BackToTop;
