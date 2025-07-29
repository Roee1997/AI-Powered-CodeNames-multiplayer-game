import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSound } from '../../hooks/useSound';

/**
 * רכיב גלובלי שמוסיף צלילים לכל הכפתורים באפליקציה
 * מתחבר אוטומטית לכפתורים חדשים שנוספים ל-DOM
 */
const GlobalSoundEffects = () => {
  const sound = useSound();
  const location = useLocation();

  useEffect(() => {
    // בדוק אם אנחנו בעמוד המשחק - אל תוסיף צלילים שם
    const isGamePage = location.pathname.includes('/game/');
    if (isGamePage) return;
    
    // פונקציה להוספת צלילים לכפתור
    const addSoundToButton = (button) => {
      // אל תוסיף אם כבר יש צלילים
      if (button.dataset.soundEnabled) return;
      
      // סמן שהכפתור כבר מטופל
      button.dataset.soundEnabled = 'true';
      
      // צליל לחיצה
      const handleClick = (e) => {
        // בדוק אם זה לא כפתור מושבת
        if (button.disabled || button.classList.contains('disabled')) return;
        
        sound.buttonClick();
      };
      
      // Hover sound removed to reduce noise
      
      button.addEventListener('click', handleClick);
      
      // שמור את ה-listeners למחיקה עתידית
      button._soundListeners = {
        click: handleClick
      };
    };
    
    // מצא כפתורים קיימים
    const findAndAddSounds = () => {
      // סלקטורים לכל סוגי הכפתורים
      const buttonSelectors = [
        'button',                           // כפתורים רגילים
        '[role="button"]',                  // כפתורים עם role
        '.btn',                            // כפתורים עם class
        'a[href]',                         // קישורים
        '[onclick]',                       // אלמנטים עם onclick
        'input[type="submit"]',            // כפתורי שליחה
        'input[type="button"]',            // כפתורי input
        '[data-testid*="button"]',         // כפתורים בבדיקות
        '.cursor-pointer',                 // אלמנטים עם cursor pointer
        '[tabindex="0"]'                   // אלמנטים ניתנים לפוקוס
      ];
      
      buttonSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(addSoundToButton);
      });
    };
    
    // הפעל בפעם הראשונה
    findAndAddSounds();
    
    // צפה בשינויים ב-DOM לכפתורים חדשים
    const observer = new MutationObserver((mutations) => {
      let hasNewElements = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              hasNewElements = true;
            }
          });
        }
      });
      
      if (hasNewElements) {
        // המתן קצת לאחר שהאלמנטים נוספו
        setTimeout(findAndAddSounds, 100);
      }
    });
    
    // התחל לצפות בשינויים
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // ניקיון
    return () => {
      observer.disconnect();
      
      // הסר listeners מכפתורים קיימים
      const buttonsWithSound = document.querySelectorAll('[data-sound-enabled="true"]');
      buttonsWithSound.forEach(button => {
        if (button._soundListeners) {
          button.removeEventListener('click', button._soundListeners.click);
          delete button._soundListeners;
          delete button.dataset.soundEnabled;
        }
      });
    };
  }, [sound, location.pathname]);

  // הרכיב לא מרנדר שום דבר - הוא רק מוסיף פונקציונליות
  return null;
};

export default GlobalSoundEffects;