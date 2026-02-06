import React, { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';
import { api } from '@/lib/api';

const PromotionalImagePopup = () => {
  const location = useLocation();
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionPopupCount, setSessionPopupCount] = useState(0);

  useEffect(() => {
    loadPromotionalImages();
    // Initialize session popup count (per browser/tab session)
    const sessionCount = parseInt(sessionStorage.getItem('promo_session_count') || '0');
    setSessionPopupCount(sessionCount);

    // Track user input activity within this session
    const handleInput = () => {
      sessionStorage.setItem('last_input_time', Date.now().toString());
    };

    const inputEvents = ['input', 'keydown', 'paste', 'change'];
    inputEvents.forEach(event => {
      document.addEventListener(event, handleInput, { passive: true });
    });

    return () => {
      inputEvents.forEach(event => {
        document.removeEventListener(event, handleInput);
      });
    };
  }, []);

  useEffect(() => {
    if (images.length === 0) return;

    // Set up periodic check for popups
    const interval = setInterval(() => {
      if (!isVisible) {
        checkAndShowPopup();
      }
    }, 30000); // Check every 30 seconds

    // Check immediately
    if (!isVisible) {
      checkAndShowPopup();
    }

    return () => clearInterval(interval);
  }, [images, isVisible, sessionPopupCount]);

  useEffect(() => {
    if (images.length > 0 && !isVisible) {
      // Show popup immediately when images are loaded and conditions are met
      setTimeout(() => checkAndShowPopup(), 1000); // Small delay to ensure page is ready
    }
  }, [images, sessionPopupCount]);

  // Add visibility change listener to check popups when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && images.length > 0 && !isVisible) {
        // Small delay to ensure page is fully active
        setTimeout(() => {
          checkAndShowPopup();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [images, isVisible, sessionPopupCount]);

  // Add user activity listeners to trigger popup checks
  useEffect(() => {
    if (images.length === 0) return;

    let activityTimeout;

    const handleUserActivity = () => {
      // Clear existing timeout
      if (activityTimeout) clearTimeout(activityTimeout);

      // Set new timeout to check for popups after user activity
      activityTimeout = setTimeout(() => {
        if (!isVisible) {
          checkAndShowPopup();
        }
      }, 2000); // Check 2 seconds after last activity
    };

    // Listen for various user activities
    const events = ['click', 'scroll', 'mousemove', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      if (activityTimeout) clearTimeout(activityTimeout);
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [images, isVisible, sessionPopupCount]);

  // Check for popups on page navigation
  useEffect(() => {
    if (images.length > 0 && !isVisible) {
      // Small delay after navigation to ensure page is loaded
      const timeout = setTimeout(() => {
        checkAndShowPopup();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [location.pathname, images, isVisible, sessionPopupCount]);

  const loadPromotionalImages = async () => {
    try {
      const res = await api.getPromotionalImages();
      const imagesData = res.images || [];
      setImages(imagesData);

      // Preload images to ensure they display instantly when popup shows
      imagesData.forEach((image) => {
        if (image.image?.url) {
          const img = new Image();
          img.src = image.image.url;
        }
      });
    } catch (err) {
      console.error('Failed to load promotional images:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkAndShowPopup = () => {
    if (images.length === 0) return;

    const currentImage = images[currentImageIndex];
    if (!currentImage) return;

    // Check if user is currently typing in form inputs to prevent data loss
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
      // Only prevent popup if user has recently typed (within last 5 seconds)
      const lastInputTime = sessionStorage.getItem('last_input_time');
      if (lastInputTime && (Date.now() - parseInt(lastInputTime)) < 5000) {
        return; // Don't show popup if user was actively typing recently
      }
    }

    // Check session popup limit (default to 3 if undefined/null). 0 means unlimited
    const maxPopups = (typeof currentImage.maxPopupsPerSession === 'number')
      ? currentImage.maxPopupsPerSession
      : 3;
    if (maxPopups > 0 && sessionPopupCount >= maxPopups) {
      return; // Reached max popups for this session
    }

    // Check if user has already seen this image recently
    const lastShownKey = `promo_${currentImage._id}_last_shown`;
    const lastShown = sessionStorage.getItem(lastShownKey);

    if (lastShown) {
      const lastShownTime = new Date(lastShown);
      const hoursSinceShown = (Date.now() - lastShownTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceShown < currentImage.displayFrequency) {
        // Not enough time has passed, try next image
        if (currentImageIndex < images.length - 1) {
          setCurrentImageIndex(currentImageIndex + 1);
        }
        return;
      }
    }

    // Show the popup
    setIsVisible(true);
    setSessionPopupCount(prev => prev + 1);
    sessionStorage.setItem('promo_session_count', (sessionPopupCount + 1).toString());

    // Track view
    api.trackPromotionalImageView(currentImage._id).catch(err =>
      console.error('Failed to track view:', err)
    );

    // Update last shown time
    sessionStorage.setItem(lastShownKey, new Date().toISOString());
  };

  const handleClose = () => {
    setIsVisible(false);

    // Move to next image for next time
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else {
      setCurrentImageIndex(0); // Reset to first image
    }
  };

  const handleImageClick = () => {
    const currentImage = images[currentImageIndex];
    if (!currentImage) return;

    // Track click
    api.trackPromotionalImageClick(currentImage._id).catch(err =>
      console.error('Failed to track click:', err)
    );

    // Open target URL if provided
    if (currentImage.targetUrl) {
      window.open(currentImage.targetUrl, '_blank');
    }

    handleClose();
  };

  const handleNext = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else {
      setCurrentImageIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    } else {
      setCurrentImageIndex(images.length - 1);
    }
  };

  if (loading || images.length === 0 || !isVisible) {
    return null;
  }

  const currentImage = images[currentImageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative max-w-md mx-4 bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors"
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              onClick={handleNext}
              className="absolute right-12 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors"
              aria-label="Next"
            >
              ›
            </button>
          </>
        )}

        {/* Image */}
        <div
          className="cursor-pointer"
          onClick={handleImageClick}
        >
          <img
            src={currentImage.image.url}
            alt={currentImage.title}
            className="w-full h-auto max-h-96 object-contain"
            loading="lazy"
          />

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h3 className="text-white font-semibold text-lg">{currentImage.title}</h3>
            {currentImage.targetUrl && (
              <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
                <ExternalLink size={12} />
                <span>Click to learn more</span>
              </div>
            )}
          </div>
        </div>

        {/* Dots indicator */}
        {images.length > 1 && (
          <div className="flex justify-center gap-2 p-3 bg-gray-50">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentImageIndex ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromotionalImagePopup;
