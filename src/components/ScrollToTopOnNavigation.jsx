import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTopOnNavigation = ({ offset = 0, behavior = 'auto' }) => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    try {
      // If navigating to an anchor (hash), try to scroll to that element
      if (hash) {
        const id = hash.replace('#', '');
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }

      // Default: scroll to top (with optional offset)
      window.scrollTo({ top: offset, left: 0, behavior });
    } catch (e) {
      // Fallback to instant scroll
      window.scrollTo(0, offset);
    }
  }, [pathname, hash, offset, behavior]);

  return null;
};

export default ScrollToTopOnNavigation;
