import React from "react";

const BackgroundImage = ({ image }) => {
  return (
    <div
      className="fixed top-0 left-0 w-full h-screen bg-cover bg-center bg-no-repeat z-[-1]"
      style={{ backgroundImage: `url(${image})` }}
    >
      {/* שכבת כהות */}
      <div className="absolute inset-0 bg-black opacity-50"></div>
    </div>
  );
};

export default BackgroundImage;