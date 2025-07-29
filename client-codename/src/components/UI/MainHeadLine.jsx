import React from 'react';
import titleImage from '../../assets/logo-codenames.png'; 

const Header = () => {
  return (
    <div className="w-full flex flex-col items-center text-center mb-4 max-ml:mb-3">
      <img
        src={titleImage}
        alt="Codenames Title"
        className="max-w-[300px] max-ml:max-w-[260px] sm:max-w-[400px] md:max-w-[500px] h-auto object-contain"
      />
      <p className="text-lg max-ml:text-base sm:text-xl font-light italic text-white drop-shadow-md mt-2 max-ml:mt-1.5 max-ml:px-4">
        משחק קבוצתי חכם וממכר, אתגרו את המחשבה שלכם עם רמזים חכמים
      </p>
    </div>
  );
};

export default Header;
