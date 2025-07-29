import React from "react";
import { Link } from "react-router-dom";
import codenamesImage from '../assets/codename.png'; // תמונה של הרקע
import titleImage from '../assets/logo-codenames.png'; // התמונה החדשה שאתה רוצה להוסיף ככותרת
import BackgroundImage from "../components/UI/BackgroundImage";
import MainHeadLine from "../components/UI/MainHeadLine";
import LoginButtons from "../components/Auth/LoginButtons";
import Footer from "../components/UI/Footer";
import '../css/index.css';

const Home = () => {
    return (
      <div className="relative w-full h-screen flex flex-col items-center justify-center">
        {/* קומפוננטת הרקע */}
        <BackgroundImage image={codenamesImage} />
  
        {/* תוכן מרכזי */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-6">
          <MainHeadLine />
          
          <LoginButtons />
        </div>
  
        {/* פוטר */}
        <Footer />
      </div>
    );
  };
  
  export default Home;